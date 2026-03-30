import type { RetrievalChunk } from "@/lib/chat/grounded-answer";
import { embedText, serializeEmbedding } from "@/lib/openai/embeddings";
import type { createClient } from "@/lib/supabase/server";

const INITIAL_CANDIDATE_COUNT = 18;
const MIN_RERANK_CANDIDATES = 8;
const FINAL_CHUNK_COUNT = 5;
const MIN_FINAL_SCORE = 3.2;
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

type AdjacentChunkRow = {
  id: string;
  chunk_index: number;
  content: string;
  character_count: number;
  created_at: string;
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
};
type DocumentTitleRow = {
  id: string;
  title: string;
};
type QueryProfile = {
  terms: string[];
  strongTerms: string[];
  aliasGroups: string[][];
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

function isComparisonQuestion(question: string) {
  return /\b(compare|comparison|difference|different|versus|vs|advantages|disadvantages)\b/i.test(
    question,
  );
}

function isDefinitionQuestion(question: string) {
  return /\b(what is|define|definition|explain|meaning|refers to)\b/i.test(question);
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

function buildQueryProfile(question: string): QueryProfile {
  const terms = extractQueryTerms(question);
  const strongTerms = extractStrongPhrases(question);
  const aliasGroups = strongTerms.map((term) => [term, ...(KEYWORD_EXPANSIONS[term] ?? [])]);

  return {
    terms,
    strongTerms,
    aliasGroups,
  };
}

function countGroupMatches(content: string, group: string[]) {
  return group.reduce((count, term) => (content.includes(term.toLowerCase()) ? count + 1 : count), 0);
}

function getOverlapMetrics(chunk: RetrievalChunk, profile: QueryProfile) {
  const normalizedContent = chunk.content.toLowerCase();
  const directTermMatches = profile.terms.filter((term) => normalizedContent.includes(term)).length;
  const strongGroupHits = profile.aliasGroups.filter((group) => countGroupMatches(normalizedContent, group) > 0).length;
  const strongAliasDensity = profile.aliasGroups.reduce(
    (score, group) => score + Math.min(countGroupMatches(normalizedContent, group), 2),
    0,
  );

  return {
    directTermMatches,
    strongGroupHits,
    strongAliasDensity,
    hasMeaningfulOverlap:
      directTermMatches >= Math.min(2, Math.max(profile.terms.length, 1)) ||
      strongGroupHits > 0,
    lacksStrongTermCoverage: profile.strongTerms.length > 0 && strongGroupHits === 0,
    lacksAnyOverlap: directTermMatches === 0 && strongGroupHits === 0,
  };
}

function scoreChunk(chunk: RankedChunkCandidate, question: string, profile: QueryProfile) {
  const normalizedContent = chunk.content.toLowerCase();
  const comparisonQuestion = isComparisonQuestion(question);
  const definitionQuestion = isDefinitionQuestion(question);
  const termCoverage =
    profile.terms.length > 0
      ? profile.terms.filter((term) => normalizedContent.includes(term)).length / profile.terms.length
      : 0;
  const overlap = getOverlapMetrics(chunk, profile);
  const punctuationCount = (chunk.content.match(/[.!?]/g) ?? []).length;
  const semanticBonus = chunk.semantic_score > 0 ? chunk.semantic_score * 4.2 : 0;
  const keywordBonus = chunk.keyword_rank > 0 ? chunk.keyword_rank * 1.8 : 0;
  const shallowPenalty = looksShallow(chunk.content) ? 2.5 : 0;
  const introPenalty = isIntroChunk(chunk.content) ? 3 : 0;
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
          profile.terms.reduce((score, term) => score + (normalizedContent.match(new RegExp(term, "g"))?.length ?? 0), 0) /
            Math.max(profile.terms.length, 1),
          3,
        ) * 0.55
      : 0;
  const strongCoverageBonus = overlap.strongGroupHits * 2.2 + Math.min(overlap.strongAliasDensity, 3) * 0.5;
  const noOverlapPenalty = overlap.lacksAnyOverlap && chunk.semantic_score < 0.55 ? 5.5 : 0;
  const weakStrongCoveragePenalty =
    overlap.lacksStrongTermCoverage && chunk.semantic_score < 0.72 ? 4 : 0;
  const rootPenalty =
    chunk.root_chunk_index !== chunk.chunk_index && looksShallow(chunk.content) ? 0.4 : 0;

  return (
    chunk.rank * 1.8 +
    chunk.root_rank * 0.6 +
    semanticBonus +
    keywordBonus +
    termCoverage * 5 +
    termDensityBonus +
    strongCoverageBonus +
    explanatoryBonus +
    punctuationBonus +
    comparisonBonus +
    definitionBonus +
    causeEffectBonus -
    noOverlapPenalty -
    weakStrongCoveragePenalty -
    shallowPenalty -
    introPenalty -
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

  const orClause = fallbackTerms.map((term) => `content.ilike.%${term}%`).join(",");
  const { data: chunkRows, error } = await supabase
    .from("document_chunks")
    .select("id, document_id, chunk_index, content, character_count, created_at")
    .or(orClause)
    .limit(40);

  if (error || !chunkRows || chunkRows.length === 0) {
    return [];
  }

  const documentIds = Array.from(new Set(chunkRows.map((row) => row.document_id)));
  const { data: documentRows } = await supabase
    .from("documents")
    .select("id, title")
    .in("id", documentIds);

  const titleMap = new Map((documentRows ?? []).map((row: DocumentTitleRow) => [row.id, row.title]));

  return (chunkRows as RawChunkRow[]).map((row) => {
    const normalizedContent = row.content.toLowerCase();
    const matchCount = fallbackTerms.reduce(
      (score, term) => score + (normalizedContent.includes(term.toLowerCase()) ? 1 : 0),
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
      rank: matchCount / Math.max(fallbackTerms.length, 1),
    } satisfies RetrievalChunk;
  });
}

export async function retrieveGroundingChunks({
  supabase,
  question,
}: {
  supabase: SupabaseServerClient;
  question: string;
}) {
  let lastError: Error | null = null;
  const profile = buildQueryProfile(question);
  const mergedCandidates = new Map<string, HybridRetrievalChunk>();

  for (const candidateQuery of buildQueryCandidates(question)) {
    const { data, error } = await fetchRpcCandidates({
      supabase,
      query: candidateQuery,
    });

    if (error) {
      lastError = new Error(error.message);
      continue;
    }

    for (const chunk of data) {
      const existing = mergedCandidates.get(chunk.chunk_id);
      const keywordRank = chunk.rank;

      if (!existing) {
        mergedCandidates.set(chunk.chunk_id, {
          ...chunk,
          rank: keywordRank,
          keyword_rank: keywordRank,
          semantic_score: 0,
        });
        continue;
      }

      mergedCandidates.set(chunk.chunk_id, {
        ...existing,
        ...chunk,
        rank: Math.max(existing.rank, keywordRank),
        keyword_rank: Math.max(existing.keyword_rank, keywordRank),
      });
    }
  }

  try {
    const semanticCandidates = await fetchSemanticCandidates({
      supabase,
      question,
    });

    for (const chunk of semanticCandidates) {
      const existing = mergedCandidates.get(chunk.chunk_id);
      const semanticScore = chunk.rank;

      if (!existing) {
        mergedCandidates.set(chunk.chunk_id, {
          ...chunk,
          rank: semanticScore,
          keyword_rank: 0,
          semantic_score: semanticScore,
        });
        continue;
      }

      mergedCandidates.set(chunk.chunk_id, {
        ...existing,
        ...chunk,
        rank: Math.max(existing.rank, semanticScore),
        semantic_score: Math.max(existing.semantic_score, semanticScore),
      });
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

    for (const chunk of fallbackCandidates) {
      const existing = mergedCandidates.get(chunk.chunk_id);
      const keywordRank = chunk.rank;

      if (!existing) {
        mergedCandidates.set(chunk.chunk_id, {
          ...chunk,
          rank: keywordRank,
          keyword_rank: keywordRank,
          semantic_score: 0,
        });
        continue;
      }

      mergedCandidates.set(chunk.chunk_id, {
        ...existing,
        ...chunk,
        rank: Math.max(existing.rank, keywordRank),
        keyword_rank: Math.max(existing.keyword_rank, keywordRank),
      });
    }
  }

  const candidates = Array.from(mergedCandidates.values());

  if (lastError && candidates.length === 0) {
    throw lastError;
  }

  if (candidates.length === 0) {
    return [];
  }

  const adjacencyTargets = candidates
    .filter(
      (chunk, index) =>
        index < 10 ||
        looksShallow(chunk.content) ||
        isIntroChunk(chunk.content) ||
        hasTopicListShape(chunk.content) ||
        isComparisonQuestion(question),
    )
    .map((chunk) => ({
      documentId: chunk.document_id,
      indices: [chunk.chunk_index - 2, chunk.chunk_index - 1, chunk.chunk_index, chunk.chunk_index + 1, chunk.chunk_index + 2].filter(
        (value) => value >= 0,
      ),
    }));

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
        .select("id, chunk_index, content, character_count, created_at")
        .eq("document_id", target.documentId)
        .in("chunk_index", target.indices);

      for (const row of adjacentRows ?? []) {
        adjacencyMap.set(`${target.documentId}:${row.chunk_index}`, row);
      }
    }),
  );

  const expandedCandidates = candidates.flatMap((chunk) => {
    const shouldExpand =
      looksShallow(chunk.content) ||
      isIntroChunk(chunk.content) ||
      hasTopicListShape(chunk.content) ||
      isComparisonQuestion(question);
    const nearbyIndices = shouldExpand
      ? [chunk.chunk_index - 1, chunk.chunk_index, chunk.chunk_index + 1, chunk.chunk_index + 2].filter(
          (index) => index >= 0,
        )
      : [chunk.chunk_index];

    const syntheticCandidates = nearbyIndices
      .map((index) => adjacencyMap.get(`${chunk.document_id}:${index}`))
      .filter((row): row is AdjacentChunkRow => Boolean(row))
      .map((row) => {
        const contextualParts = [row.chunk_index - 1, row.chunk_index, row.chunk_index + 1]
          .filter((index) => index >= 0)
          .map((index) => adjacencyMap.get(`${chunk.document_id}:${index}`)?.content ?? "");

        return {
          chunk_id: row.id,
          document_id: chunk.document_id,
          document_title: chunk.document_title,
          chunk_index: row.chunk_index,
          character_count: row.character_count,
          created_at: row.created_at,
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

  return expandedCandidates
    .reduce<RankedChunkCandidate[]>((unique, chunk) => {
      if (!unique.some((entry) => entry.chunk_id === chunk.chunk_id)) {
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

      if (overlap.lacksAnyOverlap && chunk.semantic_score < 0.55) {
        return false;
      }

      if (
        overlap.lacksStrongTermCoverage &&
        chunk.semantic_score < 0.72 &&
        !hasExplanatoryContent(chunk.content)
      ) {
        return false;
      }

      return true;
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, FINAL_CHUNK_COUNT)
    .map((entry) => ({
      ...entry.chunk,
      rank: entry.score,
    }));
}
