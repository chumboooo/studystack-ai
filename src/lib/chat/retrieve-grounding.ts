import type { RetrievalChunk } from "@/lib/chat/grounded-answer";
import { logRetrievalDiagnostic } from "@/lib/debug/retrieval-diagnostics";
import { embedText, serializeEmbedding } from "@/lib/openai/embeddings";
import type { createClient } from "@/lib/supabase/server";

const INITIAL_CANDIDATE_COUNT = 32;
const MIN_RERANK_CANDIDATES = 10;
const DEFAULT_FINAL_CHUNK_COUNT = 6;
const MIN_FINAL_SCORE = 3.2;
const SHORT_DOCUMENT_PAGE_LIMIT = 15;
const SHORT_DOCUMENT_CHUNK_LIMIT = 28;
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "their",
  "to",
  "vs",
  "with",
]);
const KEYWORD_EXPANSIONS: Record<string, string[]> = {
  https: ["http", "tls", "ssl", "secure", "encryption", "encrypted"],
  http: ["https", "web", "request", "response"],
  dns: ["domain name system", "domain", "ip address", "name resolution", "resolver"],
  tcp: ["reliable", "ordered", "connection-oriented", "acknowledgment", "packet loss"],
  udp: ["connectionless", "unordered", "faster", "datagram", "low latency"],
  sql: ["query", "database", "table", "relational"],
  mutex: ["lock", "mutual exclusion", "critical section", "thread synchronization"],
  semaphore: ["signal", "counting", "synchronization", "resource control"],
  "hash table": ["hash", "bucket", "key", "value", "constant time", "lookup"],
};
const INTRO_PATTERNS = [
  /\b(introduction|intro|overview|topic overview|chapter overview|packet overview)\b/i,
  /\b(learning objectives|key topics|topics covered|topic list|study guide)\b/i,
  /\b(suggested questions|review questions|practice questions|guiding questions)\b/i,
  /\b(in this chapter|in this section|this packet|this module)\b/i,
];
const EXPLANATORY_PATTERNS = [
  /\b(is|are|refers to|defined as|means|consists of)\b/i,
  /\b(because|so that|therefore|thus|as a result|which makes|this makes)\b/i,
  /\b(works by|uses|stores|maps|points to|allows|provides|supports)\b/i,
  /\b(average case|worst case|constant time|linear time|random access|insertion)\b/i,
];
const COMPARISON_PATTERNS = /\b(whereas|while|however|unlike|contrast|compared|versus|vs|both|difference)\b/i;
const TECHNICAL_DERIVATION_PATTERNS = [
  /\b(recall|therefore|thus|hence|solving for|substitute|differentiate|integrate)\b/i,
  /\b(derivation|derive|formula|equation|identity|theorem|rule|law|method)\b/i,
  /\b(example|worked example|solution|given|let|where|suppose)\b/i,
];
const TITLE_OR_INTRO_PATTERNS = [
  /\b(title page|table of contents|copyright|all rights reserved|author|department|course syllabus)\b/i,
  /\b(lecture notes|prepared by|version|email|office hours)\b/i,
];
const FORMULA_PATTERN =
  /([=^_]|\\frac|\\int|\\sum|\\sqrt|\b(?:sin|cos|tan|log|ln|lim|sqrt|sum|int)\b|\bd[xyz]\/d[xyz]\b|\bd\/d[xyz]\b)/i;
const EVIDENCE_SPAN_TARGET_SIZE = 1100;
const EVIDENCE_SPAN_MIN_SIZE = 320;
const EVIDENCE_BREAK_PATTERN =
  /\b(?:Recall|Therefore|Thus|Hence|Solving for|Substituting|Differentiat(?:e|ing)|Integrat(?:e|ing)|This formula|The formula|Example\s*\d*|Worked example|Solution|Definition|Theorem|Rule|Method)\b/g;

type AdjacentChunkRow = {
  id: string;
  chunk_index: number;
  content: string;
  character_count: number;
  created_at: string;
  metadata: Record<string, unknown> | null;
};
type HybridRetrievalChunk = RetrievalChunk & {
  keyword_rank: number;
  semantic_score: number;
};
type RankedChunkCandidate = HybridRetrievalChunk & {
  root_chunk_index: number;
  root_rank: number;
};
type RawChunkRow = {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  character_count: number;
  created_at: string;
  metadata: Record<string, unknown> | null;
};
type DocumentTitleRow = {
  id: string;
  title: string;
};
type DocumentCandidateRow = {
  id: string;
  title: string;
};
type DocumentContentStatsRow = {
  document_id: string;
  page_count: number | null;
  chunk_count: number | null;
  extraction_status: string;
};
type TitleMatchedDocument = {
  id: string;
  title: string;
  score: number;
  pageCount: number | null;
  chunkCount: number | null;
};
type QueryProfile = {
  terms: string[];
  strongTerms: string[];
  aliasGroups: string[][];
  phrases: string[];
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function extractQueryTerms(question: string) {
  return Array.from(
    new Set(
      question
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 3 && !STOP_WORDS.has(term)),
    ),
  );
}

function extractAcronyms(question: string) {
  return Array.from(
    new Set((question.match(/\b[A-Z0-9]{2,}\b/g) ?? []).map((term) => term.toLowerCase())),
  );
}

function expandFallbackTerms(terms: string[]) {
  return Array.from(
    new Set(
      terms.flatMap((term) => {
        const variants = [term];

        if (term.endsWith("ing") && term.length > 5) {
          variants.push(term.slice(0, -3));
        }

        if (term.endsWith("ed") && term.length > 4) {
          variants.push(term.slice(0, -2));
        }

        if (term.endsWith("s") && term.length > 4) {
          variants.push(term.slice(0, -1));
        }

        if (term.endsWith("ity") && term.length > 5) {
          variants.push(`${term.slice(0, -3)}e`);
        }

        return variants.filter((variant) => variant.length >= 2);
      }),
    ),
  );
}

function buildQueryCandidates(question: string) {
  const normalized = question.trim().replace(/\s+/g, " ");
  const terms = extractQueryTerms(question);
  const acronyms = extractAcronyms(question);
  const keywordQuery = terms.join(" ");
  const acronymQuery = acronyms.join(" ");
  const focusedQuery = [...acronyms, ...terms.filter((term) => term.length >= 4).slice(0, 5)].join(" ");

  return Array.from(new Set([normalized, keywordQuery, acronymQuery, focusedQuery].filter(Boolean)));
}

function extractStrongPhrases(question: string) {
  const normalizedQuestion = question.toLowerCase();
  const phrases = Object.keys(KEYWORD_EXPANSIONS).filter((phrase) => normalizedQuestion.includes(phrase));

  return Array.from(new Set([...extractAcronyms(question), ...phrases]));
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractQueryPhrases(question: string) {
  const terms = extractQueryTerms(question);
  const phrases = new Set<string>();

  for (let length = Math.min(5, terms.length); length >= 2; length -= 1) {
    for (let index = 0; index <= terms.length - length; index += 1) {
      phrases.add(terms.slice(index, index + length).join(" "));
    }
  }

  return Array.from(phrases);
}

function isComparisonQuestion(question: string) {
  return /\b(compare|comparison|difference|different|versus|vs|advantages|disadvantages)\b/i.test(
    question,
  );
}

function isDefinitionQuestion(question: string) {
  return /\b(what is|define|definition|explain|meaning|refers to)\b/i.test(question);
}

function allowsMultiDocumentMixing(question: string) {
  return /\b(across|between documents|all documents|all sources|compare documents|compare sources|materials)\b/i.test(
    question,
  );
}

function getTitleMatchScore(title: string, profile: QueryProfile) {
  const normalizedTitle = normalizeSearchText(title);
  const termMatches = profile.terms.filter((term) => normalizedTitle.includes(term)).length;
  const phraseMatches = profile.phrases.filter((phrase) => normalizedTitle.includes(phrase)).length;
  const strongMatches = profile.aliasGroups.filter((group) => countGroupMatches(normalizedTitle, group) > 0).length;

  return termMatches * 1.2 + phraseMatches * 2.5 + strongMatches * 1.6;
}

function looksShallow(content: string) {
  const normalized = content.replace(/\r/g, "").trim();
  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  const sentenceCount = (normalized.match(/[.!?]/g) ?? []).length;
  const averageLineLength =
    lines.length > 0 ? lines.reduce((sum, line) => sum + line.trim().length, 0) / lines.length : 0;

  return (
    normalized.length < 220 ||
    sentenceCount === 0 ||
    (lines.length >= 3 && averageLineLength < 32) ||
    /^[A-Z0-9\s,:-]+$/.test(normalized)
  );
}

function isIntroChunk(content: string) {
  return INTRO_PATTERNS.some((pattern) => pattern.test(content));
}

function hasTopicListShape(content: string) {
  const lines = content
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 3) {
    return false;
  }

  const shortLines = lines.filter((line) => line.length <= 48).length;
  const listLines = lines.filter((line) => /^[-*\d.)\s]/.test(line)).length;

  return shortLines / lines.length >= 0.6 || listLines / lines.length >= 0.5;
}

function hasExplanatoryContent(content: string) {
  return EXPLANATORY_PATTERNS.some((pattern) => pattern.test(content));
}

function getMetadataText(metadata: RetrievalChunk["metadata"]) {
  if (!metadata || typeof metadata !== "object") {
    return "";
  }

  const preferredKeys = [
    "section",
    "section_title",
    "heading",
    "title",
    "chapter",
    "chapter_title",
    "week",
    "page",
    "page_label",
    "page_start",
    "page_end",
  ];

  return preferredKeys
    .map((key) => metadata[key])
    .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
    .join(" ");
}

function normalizeMetadata(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getHeadingText(chunk: RetrievalChunk) {
  const firstLines = chunk.content
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .filter((line) => line.length <= 120 || /^\d+(?:\.\d+)*\s+/.test(line));

  return normalizeSearchText([chunk.document_title, getMetadataText(chunk.metadata), ...firstLines].join(" "));
}

function countFormulaSignals(content: string) {
  return (
    content.match(
      /[=^_]|\\frac|\\int|\\sum|\\sqrt|\b(?:sin|cos|tan|log|ln|lim|sqrt|sum|int)\b|\bd[xyz]\/d[xyz]\b|\bd\/d[xyz]\b/gi,
    ) ?? []
  ).length;
}

function hasTechnicalEvidence(content: string) {
  return FORMULA_PATTERN.test(content) || TECHNICAL_DERIVATION_PATTERNS.some((pattern) => pattern.test(content));
}

function hasDerivationOrExample(content: string) {
  return TECHNICAL_DERIVATION_PATTERNS.some((pattern) => pattern.test(content));
}

function looksLikeTitleOrIntro(chunk: RetrievalChunk) {
  const normalized = chunk.content.replace(/\r/g, "").trim();
  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  const sentenceCount = (normalized.match(/[.!?]/g) ?? []).length;
  const shortLineRatio =
    lines.length > 0 ? lines.filter((line) => line.trim().length <= 60).length / lines.length : 0;

  return (
    TITLE_OR_INTRO_PATTERNS.some((pattern) => pattern.test(normalized)) ||
    (chunk.chunk_index <= 1 && lines.length >= 3 && shortLineRatio >= 0.65 && sentenceCount <= 2)
  );
}

function buildQueryProfile(question: string): QueryProfile {
  const terms = extractQueryTerms(question);
  const strongTerms = extractStrongPhrases(question);
  const aliasGroups = strongTerms.map((term) => [term, ...(KEYWORD_EXPANSIONS[term] ?? [])]);

  return {
    terms,
    strongTerms,
    aliasGroups,
    phrases: extractQueryPhrases(question),
  };
}

function countGroupMatches(content: string, group: string[]) {
  return group.reduce((count, term) => (content.includes(normalizeSearchText(term)) ? count + 1 : count), 0);
}

function getOverlapMetrics(chunk: RetrievalChunk, profile: QueryProfile) {
  const normalizedContent = normalizeSearchText(chunk.content);
  const headingText = getHeadingText(chunk);
  const searchableText = `${headingText} ${normalizedContent}`;
  const directTermMatches = profile.terms.filter((term) => searchableText.includes(term)).length;
  const contentTermMatches = profile.terms.filter((term) => normalizedContent.includes(term)).length;
  const strongGroupHits = profile.aliasGroups.filter((group) => countGroupMatches(searchableText, group) > 0).length;
  const strongAliasDensity = profile.aliasGroups.reduce(
    (score, group) => score + Math.min(countGroupMatches(searchableText, group), 2),
    0,
  );
  const phraseMatches = profile.phrases.filter((phrase) => searchableText.includes(phrase)).length;
  const headingMatches = profile.phrases.filter((phrase) => headingText.includes(phrase)).length;

  return {
    directTermMatches,
    contentTermMatches,
    strongGroupHits,
    strongAliasDensity,
    phraseMatches,
    headingMatches,
    hasMeaningfulOverlap:
      phraseMatches > 0 ||
      directTermMatches >= Math.min(2, Math.max(profile.terms.length, 1)) ||
      strongGroupHits > 0,
    lacksStrongTermCoverage: profile.strongTerms.length > 0 && strongGroupHits === 0,
    lacksAnyOverlap: directTermMatches === 0 && strongGroupHits === 0 && phraseMatches === 0,
  };
}

function scoreChunk(chunk: RankedChunkCandidate, question: string, profile: QueryProfile) {
  const normalizedContent = normalizeSearchText(chunk.content);
  const comparisonQuestion = isComparisonQuestion(question);
  const definitionQuestion = isDefinitionQuestion(question);
  const overlap = getOverlapMetrics(chunk, profile);
  const punctuationCount = (chunk.content.match(/[.!?]/g) ?? []).length;
  const formulaSignals = countFormulaSignals(chunk.content);
  const semanticBonus = chunk.semantic_score > 0 ? chunk.semantic_score * 4.2 : 0;
  const keywordBonus = chunk.keyword_rank > 0 ? chunk.keyword_rank * 1.8 : 0;
  const shallowPenalty = looksShallow(chunk.content) && !hasTechnicalEvidence(chunk.content) ? 2.5 : 0;
  const introPenalty = isIntroChunk(chunk.content) ? 3 : 0;
  const titlePenalty = looksLikeTitleOrIntro(chunk) ? 4.2 : 0;
  const topicListPenalty = hasTopicListShape(chunk.content) ? 2 : 0;
  const explanatoryBonus = hasExplanatoryContent(chunk.content)
    ? 2.8 + Math.min(chunk.content.length / 1000, 1.2)
    : Math.min(chunk.content.length / 1400, 0.8);
  const punctuationBonus = Math.min(punctuationCount / 5, 1.2);
  const comparisonBonus = comparisonQuestion && COMPARISON_PATTERNS.test(chunk.content) ? 2 : 0;
  const definitionBonus = definitionQuestion && hasExplanatoryContent(chunk.content) ? 1.4 : 0;
  const causeEffectBonus =
    /\b(because|therefore|thus|so that|which makes|as a result)\b/i.test(chunk.content) ? 1.3 : 0;
  const termDensityBonus =
    profile.terms.length > 0
      ? Math.min(
          profile.terms.reduce(
            (score, term) => score + (normalizedContent.match(new RegExp(term, "g"))?.length ?? 0),
            0,
          ) / Math.max(profile.terms.length, 1),
          3,
        ) * 0.55
      : 0;
  const strongCoverageBonus = overlap.strongGroupHits * 2.2 + Math.min(overlap.strongAliasDensity, 3) * 0.5;
  const phraseBonus = overlap.phraseMatches * 2.6 + overlap.headingMatches * 2.4;
  const technicalBonus =
    Math.min(formulaSignals, 5) * 0.7 +
    (hasDerivationOrExample(chunk.content) ? 2.4 : 0) +
    (hasTechnicalEvidence(chunk.content) && overlap.hasMeaningfulOverlap ? 1.8 : 0);
  const pageMetadataBonus = getMetadataText(chunk.metadata) ? 0.5 : 0;
  const noOverlapPenalty = overlap.lacksAnyOverlap && chunk.semantic_score < 0.55 ? 5.5 : 0;
  const weakStrongCoveragePenalty =
    overlap.lacksStrongTermCoverage && chunk.semantic_score < 0.72 && overlap.phraseMatches === 0 ? 4 : 0;
  const rootPenalty =
    chunk.root_chunk_index !== chunk.chunk_index && looksShallow(chunk.content) ? 0.4 : 0;

  return (
    chunk.rank * 1.8 +
    chunk.root_rank * 0.6 +
    semanticBonus +
    keywordBonus +
    (profile.terms.length > 0 ? (overlap.directTermMatches / profile.terms.length) * 5 : 0) +
    termDensityBonus +
    strongCoverageBonus +
    phraseBonus +
    technicalBonus +
    pageMetadataBonus +
    explanatoryBonus +
    punctuationBonus +
    comparisonBonus +
    definitionBonus +
    causeEffectBonus -
    noOverlapPenalty -
    weakStrongCoveragePenalty -
    shallowPenalty -
    introPenalty -
    titlePenalty -
    topicListPenalty -
    rootPenalty
  );
}

function mergeAdjacentContent(parts: string[]) {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function getPageSpanWidth(metadata: RetrievalChunk["metadata"]) {
  const start = typeof metadata?.page_start === "number" ? metadata.page_start : null;
  const end = typeof metadata?.page_end === "number" ? metadata.page_end : null;

  return start !== null && end !== null ? Math.max(end - start + 1, 1) : 1;
}

function splitEvidenceUnits(content: string) {
  const marked = content.replace(EVIDENCE_BREAK_PATTERN, (match) => `\n\n${match}`);

  return marked
    .split(/\n\s*\n/g)
    .flatMap((segment) => {
      const normalized = segment.replace(/\s+/g, " ").trim();

      if (!normalized) {
        return [];
      }

      if (normalized.length <= EVIDENCE_SPAN_TARGET_SIZE * 1.35) {
        return [normalized];
      }

      return normalized
        .split(/(?<=[.!?])\s+/g)
        .map((part) => part.trim())
        .filter(Boolean);
    });
}

function splitCandidateIntoEvidenceSpans(chunk: RankedChunkCandidate): RankedChunkCandidate[] {
  const shouldSubchunk =
    chunk.content.length > 1500 ||
    (getPageSpanWidth(chunk.metadata) > 1 && hasTechnicalEvidence(chunk.content));

  if (!shouldSubchunk) {
    return [chunk];
  }

  const units = splitEvidenceUnits(chunk.content);
  const spans: RankedChunkCandidate[] = [];
  let buffer = "";

  for (const unit of units) {
    const nextValue = buffer ? `${buffer}\n\n${unit}` : unit;

    if (nextValue.length <= EVIDENCE_SPAN_TARGET_SIZE || buffer.length < EVIDENCE_SPAN_MIN_SIZE) {
      buffer = nextValue;
      continue;
    }

    spans.push({
      ...chunk,
      content: buffer,
      character_count: buffer.length,
      metadata: {
        ...(chunk.metadata ?? {}),
        evidence_span_index: spans.length,
        evidence_span_strategy: "technical-rerank-v1",
      },
    });
    buffer = unit;
  }

  if (buffer) {
    spans.push({
      ...chunk,
      content: buffer,
      character_count: buffer.length,
      metadata: {
        ...(chunk.metadata ?? {}),
        evidence_span_index: spans.length,
        evidence_span_strategy: "technical-rerank-v1",
      },
    });
  }

  return spans.length > 0 ? spans : [chunk];
}

function toHybridChunk(chunk: RetrievalChunk, source: "keyword" | "semantic" | "fallback"): HybridRetrievalChunk {
  return {
    ...chunk,
    keyword_rank: source === "semantic" ? 0 : chunk.rank,
    semantic_score: source === "semantic" ? chunk.rank : 0,
  };
}

function mergeCandidate(map: Map<string, HybridRetrievalChunk>, chunk: RetrievalChunk, source: "keyword" | "semantic" | "fallback") {
  const existing = map.get(chunk.chunk_id);
  const next = toHybridChunk(chunk, source);

  if (!existing) {
    map.set(chunk.chunk_id, next);
    return;
  }

  map.set(chunk.chunk_id, {
    ...existing,
    ...chunk,
    rank: Math.max(existing.rank, chunk.rank),
    keyword_rank: source === "semantic" ? existing.keyword_rank : Math.max(existing.keyword_rank, chunk.rank),
    semantic_score: source === "semantic" ? Math.max(existing.semantic_score, chunk.rank) : existing.semantic_score,
  });
}

async function fetchRpcCandidates({
  supabase,
  query,
}: {
  supabase: SupabaseServerClient;
  query: string;
}) {
  const { data, error } = await supabase.rpc("search_document_chunks", {
    query_text: query,
    match_count: INITIAL_CANDIDATE_COUNT,
  });

  return {
    data: (data ?? []) as RetrievalChunk[],
    error,
  };
}

async function fetchSemanticCandidates({
  supabase,
  question,
}: {
  supabase: SupabaseServerClient;
  question: string;
}): Promise<RetrievalChunk[]> {
  const embedding = await embedText(question);

  if (embedding.length === 0) {
    return [];
  }

  const { data, error } = await supabase.rpc("match_document_chunks_by_embedding", {
    query_embedding: serializeEmbedding(embedding),
    match_count: INITIAL_CANDIDATE_COUNT,
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<
    Omit<RetrievalChunk, "rank"> & {
      similarity: number;
    }
  >).map((chunk) => ({
    chunk_id: chunk.chunk_id,
    document_id: chunk.document_id,
    document_title: chunk.document_title,
    chunk_index: chunk.chunk_index,
    content: chunk.content,
    character_count: chunk.character_count,
    created_at: chunk.created_at,
    rank: chunk.similarity,
    metadata: normalizeMetadata(chunk.metadata),
  }));
}

async function fetchIlikeFallbackCandidates({
  supabase,
  question,
}: {
  supabase: SupabaseServerClient;
  question: string;
}): Promise<RetrievalChunk[]> {
  const fallbackTerms = expandFallbackTerms([
    ...extractAcronyms(question),
    ...extractQueryTerms(question),
  ]).slice(0, 8);

  if (fallbackTerms.length === 0) {
    return [];
  }

  const orClause = fallbackTerms
    .map((term) => term.replace(/[,%]/g, "").trim())
    .filter(Boolean)
    .map((term) => `content.ilike.%${term}%`)
    .join(",");

  if (!orClause) {
    return [];
  }

  const { data: chunkRows, error } = await supabase
    .from("document_chunks")
    .select("id, document_id, chunk_index, content, character_count, created_at, metadata")
    .or(orClause)
    .limit(60);

  if (error || !chunkRows || chunkRows.length === 0) {
    return [];
  }

  return hydrateDocumentTitles(supabase, chunkRows as RawChunkRow[], fallbackTerms);
}

async function hydrateDocumentTitles(
  supabase: SupabaseServerClient,
  chunkRows: RawChunkRow[],
  fallbackTerms: string[],
) {
  const documentIds = Array.from(new Set(chunkRows.map((row) => row.document_id)));
  const { data: documentRows } = await supabase
    .from("documents")
    .select("id, title")
    .in("id", documentIds);

  const titleMap = new Map((documentRows ?? []).map((row: DocumentTitleRow) => [row.id, row.title]));

  return chunkRows.map((row) => {
    const normalizedContent = normalizeSearchText(row.content);
    const matchCount = fallbackTerms.reduce(
      (score, term) => score + (normalizedContent.includes(normalizeSearchText(term)) ? 1 : 0),
      0,
    );

    return {
      chunk_id: row.id,
      document_id: row.document_id,
      document_title: titleMap.get(row.document_id) ?? "Untitled document",
      chunk_index: row.chunk_index,
      content: row.content,
      character_count: row.character_count,
      created_at: row.created_at,
      metadata: normalizeMetadata(row.metadata),
      rank: matchCount / Math.max(fallbackTerms.length, 1),
    } satisfies RetrievalChunk;
  });
}

async function fetchDocumentContentStats({
  supabase,
  documentIds,
}: {
  supabase: SupabaseServerClient;
  documentIds: string[];
}) {
  if (documentIds.length === 0) {
    return new Map<string, DocumentContentStatsRow>();
  }

  const { data } = await supabase
    .from("document_contents")
    .select("document_id, page_count, chunk_count, extraction_status")
    .in("document_id", documentIds);

  return new Map(
    ((data ?? []) as DocumentContentStatsRow[]).map((row) => [row.document_id, row]),
  );
}

async function fetchTitleMatchedDocuments({
  supabase,
  question,
  documentId,
  profile,
}: {
  supabase: SupabaseServerClient;
  question: string;
  documentId?: string;
  profile: QueryProfile;
}): Promise<TitleMatchedDocument[]> {
  if (allowsMultiDocumentMixing(question)) {
    return [];
  }

  let documentsQuery = supabase
    .from("documents")
    .select("id, title")
    .order("created_at", { ascending: false })
    .limit(100);

  if (documentId) {
    documentsQuery = documentsQuery.eq("id", documentId);
  }

  const { data: documents } = await documentsQuery;
  const documentRows = (documents ?? []) as DocumentCandidateRow[];
  const statsMap = await fetchDocumentContentStats({
    supabase,
    documentIds: documentRows.map((document) => document.id),
  });

  return documentRows
    .map((document) => {
      const stats = statsMap.get(document.id);
      const score = getTitleMatchScore(document.title, profile);

      return {
        id: document.id,
        title: document.title,
        score,
        pageCount: stats?.page_count ?? null,
        chunkCount: stats?.chunk_count ?? null,
        status: stats?.extraction_status ?? null,
      };
    })
    .filter(
      (document) =>
        document.status === "completed" &&
        document.score >= 2.2 &&
        ((document.pageCount !== null && document.pageCount <= SHORT_DOCUMENT_PAGE_LIMIT) ||
          (document.chunkCount !== null && document.chunkCount <= SHORT_DOCUMENT_CHUNK_LIMIT) ||
          document.score >= 4),
    )
    .sort((left, right) => right.score - left.score)
    .map(({ status, ...document }) => document);
}

function chooseTitleLockedDocument(matches: TitleMatchedDocument[]) {
  const [top, second] = matches;

  if (!top) {
    return null;
  }

  if (!second || top.score >= second.score * 1.2) {
    return top.id;
  }

  return null;
}

async function fetchShortDocumentFallbackCandidates({
  supabase,
  question,
  documentId,
  candidateDocumentIds,
  titleMatchedDocumentIds,
}: {
  supabase: SupabaseServerClient;
  question: string;
  documentId?: string;
  candidateDocumentIds: string[];
  titleMatchedDocumentIds: string[];
}) {
  const profile = buildQueryProfile(question);
  let documentsQuery = supabase
    .from("documents")
    .select("id, title")
    .order("created_at", { ascending: false })
    .limit(100);

  if (documentId) {
    documentsQuery = documentsQuery.eq("id", documentId);
  } else if (titleMatchedDocumentIds.length > 0) {
    documentsQuery = documentsQuery.in("id", titleMatchedDocumentIds);
  }

  const { data: documents } = await documentsQuery;
  const documentRows = (documents ?? []) as DocumentCandidateRow[];
  const statsMap = await fetchDocumentContentStats({
    supabase,
    documentIds: documentRows.map((document) => document.id),
  });
  const candidateSet = new Set(candidateDocumentIds);
  const titleMatchedSet = new Set(titleMatchedDocumentIds);
  const shortDocuments = documentRows.filter((document) => {
    const stats = statsMap.get(document.id);

    if (stats?.extraction_status !== "completed") {
      return false;
    }

    return (
      document.id === documentId ||
      candidateSet.has(document.id) ||
      titleMatchedSet.has(document.id) ||
      (stats.page_count !== null && stats.page_count <= SHORT_DOCUMENT_PAGE_LIMIT) ||
      (stats.chunk_count !== null && stats.chunk_count <= SHORT_DOCUMENT_CHUNK_LIMIT)
    );
  });

  if (shortDocuments.length === 0) {
    return [];
  }

  const documentIds = shortDocuments.map((document) => document.id);
  const titleMap = new Map(shortDocuments.map((document) => [document.id, document.title]));
  const { data: chunkRows } = await supabase
    .from("document_chunks")
    .select("id, document_id, chunk_index, content, character_count, created_at, metadata")
    .in("document_id", documentIds)
    .order("chunk_index", { ascending: true })
    .limit(1200);

  return ((chunkRows ?? []) as RawChunkRow[])
    .map((row) => {
      const chunk = {
        chunk_id: row.id,
        document_id: row.document_id,
        document_title: titleMap.get(row.document_id) ?? "Untitled document",
        chunk_index: row.chunk_index,
        content: row.content,
        character_count: row.character_count,
        created_at: row.created_at,
        metadata: normalizeMetadata(row.metadata),
        rank: 0,
      } satisfies RetrievalChunk;
      const overlap = getOverlapMetrics(chunk, profile);
      const score =
        overlap.directTermMatches * 0.18 +
        overlap.phraseMatches * 0.28 +
        overlap.headingMatches * 0.3 +
        (hasTechnicalEvidence(row.content) ? 0.18 : 0) +
        Math.min(countFormulaSignals(row.content), 4) * 0.04;

      return {
        ...chunk,
        rank: score,
      };
    })
    .filter((chunk) => {
      const overlap = getOverlapMetrics(chunk, profile);

      return (
        chunk.document_id === documentId ||
        overlap.hasMeaningfulOverlap ||
        (hasTechnicalEvidence(chunk.content) && overlap.directTermMatches > 0)
      );
    })
    .sort((left, right) => right.rank - left.rank)
    .slice(0, 80);
}

function filterToDocument(chunks: RetrievalChunk[], documentId?: string) {
  return documentId ? chunks.filter((chunk) => chunk.document_id === documentId) : chunks;
}

function selectDominantDocument({
  scored,
  question,
  documentId,
}: {
  scored: Array<{
    chunk: RankedChunkCandidate;
    score: number;
    overlap: ReturnType<typeof getOverlapMetrics>;
  }>;
  question: string;
  documentId?: string;
}) {
  if (documentId || allowsMultiDocumentMixing(question) || scored.length === 0) {
    return documentId ?? null;
  }

  const documentScores = new Map<string, { score: number; strongEvidence: boolean }>();

  for (const entry of scored.slice(0, 12)) {
    const existing = documentScores.get(entry.chunk.document_id) ?? { score: 0, strongEvidence: false };
    existing.score += entry.score;
    existing.strongEvidence =
      existing.strongEvidence ||
      entry.overlap.hasMeaningfulOverlap ||
      (hasTechnicalEvidence(entry.chunk.content) && entry.overlap.directTermMatches > 0);
    documentScores.set(entry.chunk.document_id, existing);
  }

  const sorted = Array.from(documentScores.entries()).sort((left, right) => right[1].score - left[1].score);
  const [top, second] = sorted;

  if (!top) {
    return null;
  }

  if (!second || (top[1].strongEvidence && top[1].score >= second[1].score * 1.18)) {
    return top[0];
  }

  return null;
}

export async function retrieveGroundingChunks({
  supabase,
  question,
  documentId,
  matchCount,
}: {
  supabase: SupabaseServerClient;
  question: string;
  documentId?: string;
  matchCount?: number;
}) {
  let lastError: Error | null = null;
  const finalCount = matchCount ?? DEFAULT_FINAL_CHUNK_COUNT;
  const profile = buildQueryProfile(question);
  const titleMatchedDocuments = await fetchTitleMatchedDocuments({
    supabase,
    question,
    documentId,
    profile,
  });
  const titleLockedDocumentId = documentId ?? chooseTitleLockedDocument(titleMatchedDocuments) ?? undefined;
  const mergedCandidates = new Map<string, HybridRetrievalChunk>();

  logRetrievalDiagnostic("retrieval.started", {
    questionLength: question.length,
    requestedDocumentId: documentId ?? null,
    titleLockedDocumentId: titleLockedDocumentId ?? null,
    titleMatches: titleMatchedDocuments.map((document) => ({
      id: document.id,
      title: document.title,
      score: document.score,
      pageCount: document.pageCount,
      chunkCount: document.chunkCount,
    })),
  });

  for (const candidateQuery of buildQueryCandidates(question)) {
    const { data, error } = await fetchRpcCandidates({
      supabase,
      query: candidateQuery,
    });

    if (error) {
      lastError = new Error(error.message);
      continue;
    }

    for (const chunk of filterToDocument(data, titleLockedDocumentId)) {
      mergeCandidate(mergedCandidates, chunk, "keyword");
    }
  }

  try {
    const semanticCandidates = await fetchSemanticCandidates({
      supabase,
      question,
    });

    for (const chunk of filterToDocument(semanticCandidates, titleLockedDocumentId)) {
      mergeCandidate(mergedCandidates, chunk, "semantic");
    }
  } catch (error) {
    if (!lastError) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (mergedCandidates.size < MIN_RERANK_CANDIDATES) {
    const fallbackCandidates = await fetchIlikeFallbackCandidates({
      supabase,
      question,
    });

    for (const chunk of filterToDocument(fallbackCandidates, titleLockedDocumentId)) {
      mergeCandidate(mergedCandidates, chunk, "fallback");
    }
  }

  const shortFallbackCandidates = await fetchShortDocumentFallbackCandidates({
    supabase,
    question,
    documentId: titleLockedDocumentId,
    candidateDocumentIds: Array.from(new Set(Array.from(mergedCandidates.values()).map((chunk) => chunk.document_id))),
    titleMatchedDocumentIds: titleMatchedDocuments.map((document) => document.id),
  });

  for (const chunk of shortFallbackCandidates) {
    mergeCandidate(mergedCandidates, chunk, "fallback");
  }

  const candidateStats = await fetchDocumentContentStats({
    supabase,
    documentIds: Array.from(new Set(Array.from(mergedCandidates.values()).map((chunk) => chunk.document_id))),
  });
  const candidates = Array.from(mergedCandidates.values()).filter((chunk) => {
    const stats = candidateStats.get(chunk.document_id);

    return stats?.extraction_status === "completed" || chunk.document_id === titleLockedDocumentId;
  });

  logRetrievalDiagnostic("retrieval.candidates", {
    requestedDocumentId: documentId ?? null,
    titleLockedDocumentId: titleLockedDocumentId ?? null,
    mergedCandidateCount: mergedCandidates.size,
    completedCandidateCount: candidates.length,
    candidateDocuments: Array.from(
      new Set(candidates.map((chunk) => `${chunk.document_title}:${chunk.document_id}`)),
    ).slice(0, 12),
  });

  if (lastError && candidates.length === 0) {
    throw lastError;
  }

  if (candidates.length === 0) {
    return [];
  }

  const adjacencyTargets = candidates
    .filter(
      (chunk, index) =>
        index < 16 ||
        looksShallow(chunk.content) ||
        isIntroChunk(chunk.content) ||
        hasTopicListShape(chunk.content) ||
        hasTechnicalEvidence(chunk.content) ||
        isComparisonQuestion(question),
    )
    .map((chunk) => {
      const technicalWindow = hasTechnicalEvidence(chunk.content) || hasDerivationOrExample(chunk.content);
      const radius = technicalWindow ? 2 : 1;
      const indices = Array.from({ length: radius * 2 + 1 }, (_, offset) => chunk.chunk_index - radius + offset)
        .filter((value) => value >= 0);

      return {
        documentId: chunk.document_id,
        indices,
      };
    });

  const uniqueTargets = Array.from(
    new Map(
      adjacencyTargets.map((target) => [
        `${target.documentId}:${target.indices.join(",")}`,
        target,
      ]),
    ).values(),
  );

  const adjacencyMap = new Map<string, AdjacentChunkRow>();

  await Promise.all(
    uniqueTargets.map(async (target) => {
      const { data: adjacentRows } = await supabase
        .from("document_chunks")
        .select("id, chunk_index, content, character_count, created_at, metadata")
        .eq("document_id", target.documentId)
        .in("chunk_index", target.indices);

      for (const row of adjacentRows ?? []) {
        adjacencyMap.set(`${target.documentId}:${row.chunk_index}`, {
          id: row.id,
          chunk_index: row.chunk_index,
          content: row.content,
          character_count: row.character_count,
          created_at: row.created_at,
          metadata: normalizeMetadata(row.metadata),
        });
      }
    }),
  );

  const expandedCandidates = candidates.flatMap((chunk) => {
    const shouldExpand =
      looksShallow(chunk.content) ||
      isIntroChunk(chunk.content) ||
      hasTopicListShape(chunk.content) ||
      hasTechnicalEvidence(chunk.content) ||
      isComparisonQuestion(question);
    const radius = hasTechnicalEvidence(chunk.content) || hasDerivationOrExample(chunk.content) ? 2 : 1;
    const nearbyIndices = shouldExpand
      ? Array.from({ length: radius * 2 + 1 }, (_, offset) => chunk.chunk_index - radius + offset).filter(
          (index) => index >= 0,
        )
      : [chunk.chunk_index];

    const syntheticCandidates = nearbyIndices
      .map((index) => adjacencyMap.get(`${chunk.document_id}:${index}`))
      .filter((row): row is AdjacentChunkRow => Boolean(row))
      .map((row) => {
        const contextualParts = Array.from({ length: radius * 2 + 1 }, (_, offset) => row.chunk_index - radius + offset)
          .filter((index) => index >= 0)
          .map((index) => adjacencyMap.get(`${chunk.document_id}:${index}`)?.content ?? "");

        return {
          chunk_id: row.id,
          document_id: chunk.document_id,
          document_title: chunk.document_title,
          chunk_index: row.chunk_index,
          character_count: row.character_count,
          created_at: row.created_at,
          metadata: row.metadata,
          rank: chunk.rank,
          keyword_rank: chunk.keyword_rank,
          semantic_score: chunk.semantic_score,
          root_chunk_index: chunk.chunk_index,
          root_rank: chunk.rank,
          content: mergeAdjacentContent(contextualParts),
        } satisfies RankedChunkCandidate;
      });

    return syntheticCandidates.length > 0
      ? syntheticCandidates
      : [
          {
            ...chunk,
            root_chunk_index: chunk.chunk_index,
            root_rank: chunk.rank,
          } satisfies RankedChunkCandidate,
        ];
  });

  const evidenceCandidates = expandedCandidates.flatMap(splitCandidateIntoEvidenceSpans);

  logRetrievalDiagnostic("retrieval.evidence_spans", {
    expandedCandidateCount: expandedCandidates.length,
    evidenceCandidateCount: evidenceCandidates.length,
    subchunkedCount: evidenceCandidates.filter((chunk) => chunk.metadata?.evidence_span_strategy).length,
  });

  const scored = evidenceCandidates
    .reduce<RankedChunkCandidate[]>((unique, chunk) => {
      const uniqueKey = `${chunk.chunk_id}:${chunk.metadata?.evidence_span_index ?? "full"}:${chunk.content.slice(0, 80)}`;

      if (
        !unique.some(
          (entry) =>
            `${entry.chunk_id}:${entry.metadata?.evidence_span_index ?? "full"}:${entry.content.slice(0, 80)}` ===
            uniqueKey,
        )
      ) {
        unique.push(chunk);
      }

      return unique;
    }, [])
    .map((chunk) => ({
      chunk,
      score: scoreChunk(chunk, question, profile),
      overlap: getOverlapMetrics(chunk, profile),
    }))
    .filter(({ overlap, chunk, score }) => {
      if (score < MIN_FINAL_SCORE) {
        return false;
      }

      if (overlap.lacksAnyOverlap && chunk.semantic_score < 0.55 && !hasTechnicalEvidence(chunk.content)) {
        return false;
      }

      if (
        overlap.lacksStrongTermCoverage &&
        chunk.semantic_score < 0.72 &&
        !hasExplanatoryContent(chunk.content) &&
        !hasTechnicalEvidence(chunk.content)
      ) {
        return false;
      }

      return true;
    })
    .sort((left, right) => right.score - left.score);

  const dominantDocumentId = selectDominantDocument({
    scored,
    question,
    documentId: titleLockedDocumentId,
  });
  const sourceFiltered = dominantDocumentId
    ? scored.filter((entry) => entry.chunk.document_id === dominantDocumentId)
    : scored;
  const finalSources = sourceFiltered.slice(0, finalCount).map((entry) => ({
    ...entry.chunk,
    rank: entry.score,
  }));

  logRetrievalDiagnostic("retrieval.final_sources", {
    requestedDocumentId: documentId ?? null,
    titleLockedDocumentId: titleLockedDocumentId ?? null,
    dominantDocumentId,
    finalCount: finalSources.length,
    sources: finalSources.map((chunk) => ({
      documentId: chunk.document_id,
      documentTitle: chunk.document_title,
      chunkIndex: chunk.chunk_index,
      rank: Number(chunk.rank.toFixed(3)),
      pageStart: chunk.metadata?.page_start ?? null,
      pageEnd: chunk.metadata?.page_end ?? null,
    })),
  });

  return finalSources;
}
