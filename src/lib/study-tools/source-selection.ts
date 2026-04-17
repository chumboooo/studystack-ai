import type { RetrievalChunk } from "@/lib/chat/grounded-answer";

const GENERIC_STUDY_WORDS = new Set([
  "flashcard",
  "flashcards",
  "quiz",
  "quizzes",
  "deck",
  "set",
  "study",
  "review",
  "practice",
  "prep",
]);
const STOP_WORDS = new Set([
  "a",
  "about",
  "all",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "generate",
  "give",
  "how",
  "in",
  "is",
  "it",
  "me",
  "of",
  "on",
  "or",
  "please",
  "some",
  "teach",
  "tell",
  "that",
  "the",
  "these",
  "this",
  "their",
  "to",
  "vs",
  "what",
  "with",
]);
const INTRO_PATTERNS = [
  /\b(introduction|intro|overview|packet overview|chapter overview|preface)\b/i,
  /\b(learning objectives|key topics|topics covered|topic list|study guide|how to use)\b/i,
  /\b(suggested questions|review questions|practice questions)\b/i,
];
const EXPLANATORY_PATTERNS = [
  /\b(is|are|refers to|defined as|means|consists of)\b/i,
  /\b(because|therefore|thus|as a result|which makes|this makes)\b/i,
  /\b(works by|uses|stores|maps|points to|allows|provides|supports)\b/i,
  /\b(reliable|ordered|unordered|connectionless|connection-oriented)\b/i,
  /\b(primary key|foreign key|index|transaction|hash table|linked list|thread|process)\b/i,
  /\b(force|acceleration|inertia|momentum|velocity|mass|net force|inertial frame)\b/i,
];
const COMPARISON_PATTERNS =
  /\b(compare|comparison|difference|different|versus|vs|whereas|while|however|unlike|contrast)\b/i;
const OFF_TOPIC_STUDY_MATERIAL_PATTERNS = [
  /\b(textbook|book design|teaching style|learning style|pedagogy|pedagogical)\b/i,
  /\b(student-centered|instructor|curriculum|course design|author|preface)\b/i,
  /\b(homework system|online homework|learning platform|study method|study skills)\b/i,
];
const QUERY_EXPANSIONS: Record<string, string[]> = {
  acceleration: ["accelerate"],
  force: ["forces", "net force"],
  forces: ["force", "net force"],
  inertia: ["inertial"],
  inertial: ["inertia"],
  law: ["laws"],
  laws: ["law"],
  newton: ["newtonian"],
  momentum: ["impulse"],
  oscillation: ["oscillations", "oscillate"],
  oscillations: ["oscillation", "oscillate"],
  work: ["energy"],
};

export type StudySourceChunk = RetrievalChunk;
type TopicProfile = {
  terms: string[];
  termGroups: string[][];
  phrases: string[];
  asksForStudyMaterial: boolean;
};

export function buildStudyQueryTerms(queryText: string) {
  return Array.from(
    new Set(
      queryText
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((term) => term.trim())
        .filter(
          (term) =>
            term.length >= 3 &&
            !STOP_WORDS.has(term) &&
            !GENERIC_STUDY_WORDS.has(term),
        ),
    ),
  );
}

function normalizePhrase(value: string) {
  return value
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTermVariants(term: string) {
  const variants = new Set([term, ...(QUERY_EXPANSIONS[term] ?? [])]);

  if (term.endsWith("s") && term.length > 4) {
    variants.add(term.slice(0, -1));
  }

  if (term.endsWith("ing") && term.length > 5) {
    variants.add(term.slice(0, -3));
  }

  if (term.endsWith("ed") && term.length > 4) {
    variants.add(term.slice(0, -2));
  }

  return Array.from(variants).filter((variant) => variant.length >= 3);
}

function extractStudyPhrases(queryText: string) {
  const normalized = normalizePhrase(queryText);
  const phrases = new Set<string>();

  for (const quoted of queryText.matchAll(/"([^"]+)"/g)) {
    if (quoted[1].trim().length >= 4) {
      phrases.add(normalizePhrase(quoted[1]));
    }
  }

  const titleCasePhrases = queryText.match(/\b[A-Z][a-z]+(?:['\u2019]s)?(?:\s+[A-Z][a-z]+(?:['\u2019]s)?){0,4}\b/g) ?? [];
  for (const phrase of titleCasePhrases) {
    const normalizedPhrase = normalizePhrase(phrase);

    if (normalizedPhrase.length >= 4 && !GENERIC_STUDY_WORDS.has(normalizedPhrase)) {
      phrases.add(normalizedPhrase);
    }
  }

  const terms = buildStudyQueryTerms(queryText);
  for (let length = Math.min(4, terms.length); length >= 2; length -= 1) {
    for (let index = 0; index <= terms.length - length; index += 1) {
      phrases.add(terms.slice(index, index + length).join(" "));
    }
  }

  return Array.from(phrases);
}

function buildTopicProfile(queryText: string): TopicProfile {
  const terms = buildStudyQueryTerms(queryText);

  return {
    terms,
    termGroups: terms.map(getTermVariants),
    phrases: extractStudyPhrases(queryText),
    asksForStudyMaterial: /\b(textbook|study method|learning style|pedagogy|preface|course design)\b/i.test(
      queryText,
    ),
  };
}

function stringifyMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return "";
  }

  const record = metadata as Record<string, unknown>;
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
  ];

  return preferredKeys
    .map((key) => record[key])
    .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
    .join(" ");
}

function getHeadingCandidateText(chunk: StudySourceChunk) {
  const firstLines = chunk.content
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
    .filter((line) => line.length <= 120 || /^\d+(?:\.\d+)*\s+/.test(line));

  return normalizePhrase(
    [chunk.document_title, stringifyMetadata(chunk.metadata), ...firstLines].filter(Boolean).join(" "),
  );
}

function getTopicEvidence(chunk: StudySourceChunk, profile: TopicProfile) {
  const normalizedContent = normalizePhrase(chunk.content);
  const headingText = getHeadingCandidateText(chunk);
  const searchableText = `${headingText} ${normalizedContent}`;
  const directTermMatches = profile.termGroups.filter((group) =>
    group.some((term) => searchableText.includes(term)),
  ).length;
  const contentTermMatches = profile.termGroups.filter((group) =>
    group.some((term) => normalizedContent.includes(term)),
  ).length;
  const phraseMatches = profile.phrases.filter((phrase) => searchableText.includes(phrase)).length;
  const headingMatches = profile.phrases.filter((phrase) => headingText.includes(phrase)).length;
  const hasEnoughTerms =
    profile.terms.length === 0 ||
    directTermMatches >= Math.min(2, profile.terms.length) ||
    (profile.terms.length <= 2 && directTermMatches >= 1);

  return {
    directTermMatches,
    contentTermMatches,
    phraseMatches,
    headingMatches,
    hasTopicEvidence: phraseMatches > 0 || hasEnoughTerms,
  };
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

function isOffTopicStudyMaterial(content: string, profile: TopicProfile) {
  return (
    !profile.asksForStudyMaterial &&
    OFF_TOPIC_STUDY_MATERIAL_PATTERNS.some((pattern) => pattern.test(content))
  );
}

export function scoreStudyChunk({
  chunk,
  queryText,
}: {
  chunk: StudySourceChunk;
  queryText: string;
}) {
  const normalizedContent = chunk.content.toLowerCase();
  const profile = buildTopicProfile(queryText);
  const queryTerms = profile.terms;
  const topicEvidence = getTopicEvidence(chunk, profile);
  const termCoverage =
    queryTerms.length > 0
      ? topicEvidence.directTermMatches / queryTerms.length
      : 0;
  const termDensity =
    queryTerms.length > 0
      ? Math.min(
          profile.termGroups.reduce(
            (score, group) =>
              score +
              group.reduce(
                (groupScore, term) =>
                  groupScore + (normalizedContent.match(new RegExp(term, "g"))?.length ?? 0),
                0,
              ),
            0,
          ) / Math.max(queryTerms.length, 1),
          3,
        )
      : 0;
  const punctuationCount = (chunk.content.match(/[.!?]/g) ?? []).length;
  const explanatoryBonus = hasExplanatoryContent(chunk.content)
    ? 2.8 + Math.min(chunk.content.length / 1000, 1.2)
    : Math.min(chunk.content.length / 1500, 0.7);
  const comparisonBonus = COMPARISON_PATTERNS.test(queryText) && COMPARISON_PATTERNS.test(chunk.content) ? 1.6 : 0;
  const introPenalty = INTRO_PATTERNS.some((pattern) => pattern.test(chunk.content)) ? 3 : 0;
  const listPenalty = hasTopicListShape(chunk.content) ? 2.2 : 0;
  const shallowPenalty = looksShallow(chunk.content) ? 2.4 : 0;
  const phraseBonus = topicEvidence.phraseMatches * 3.2 + topicEvidence.headingMatches * 2.2;
  const headingBonus = topicEvidence.headingMatches > 0 ? 2.4 : 0;
  const contentMatchBonus = topicEvidence.contentTermMatches * 1.1;
  const offTopicPenalty = isOffTopicStudyMaterial(chunk.content, profile) ? 8 : 0;
  const weakTopicPenalty = !topicEvidence.hasTopicEvidence && chunk.rank < 0.72 ? 5 : 0;

  return (
    chunk.rank * 1.6 +
    termCoverage * 4.8 +
    termDensity * 0.7 +
    phraseBonus +
    headingBonus +
    contentMatchBonus +
    explanatoryBonus +
    Math.min(punctuationCount / 5, 1.1) +
    comparisonBonus -
    offTopicPenalty -
    weakTopicPenalty -
    introPenalty -
    listPenalty -
    shallowPenalty
  );
}

export function selectStudyChunks({
  chunks,
  queryText,
  limit,
}: {
  chunks: StudySourceChunk[];
  queryText: string;
  limit: number;
}) {
  const profile = buildTopicProfile(queryText);
  const deduped = Array.from(
    new Map(chunks.map((chunk) => [chunk.chunk_id, chunk])).values(),
  );

  const ranked = deduped
    .map((chunk) => ({
      chunk,
      score: scoreStudyChunk({
        chunk,
        queryText,
      }),
      topicEvidence: getTopicEvidence(chunk, profile),
      offTopic: isOffTopicStudyMaterial(chunk.content, profile),
    }))
    .sort((left, right) => right.score - left.score);

  const filtered =
    ranked.length > limit
      ? ranked.filter(
          (entry, index) =>
            !entry.offTopic &&
            (entry.topicEvidence.hasTopicEvidence ||
              entry.chunk.rank >= 0.72 ||
              index < Math.max(2, Math.ceil(limit / 3))) &&
            (entry.score >= 1.4 || index < Math.max(2, limit)),
        )
      : ranked;

  const selected = filtered.length > 0 ? filtered : ranked.filter((entry) => !entry.offTopic);

  return selected.slice(0, limit).map((entry) => ({
    ...entry.chunk,
    rank: Math.max(entry.chunk.rank, entry.score),
  }));
}

export function isGeneratedStudyItemRelevant({
  itemText,
  sourceContent,
  queryText,
}: {
  itemText: string;
  sourceContent: string;
  queryText: string;
}) {
  const profile = buildTopicProfile(queryText);
  const sourceAsChunk = {
    chunk_id: "source",
    document_id: "document",
    document_title: "",
    chunk_index: 0,
    content: sourceContent,
    character_count: sourceContent.length,
    created_at: "",
    rank: 0,
  } satisfies StudySourceChunk;
  const sourceEvidence = getTopicEvidence(sourceAsChunk, profile);

  if (!sourceEvidence.hasTopicEvidence) {
    return false;
  }

  if (isOffTopicStudyMaterial(itemText, profile)) {
    return false;
  }

  const sourceText = normalizePhrase(sourceContent);
  const itemTerms = buildStudyQueryTerms(itemText)
    .filter((term) => !GENERIC_STUDY_WORDS.has(term))
    .slice(0, 24);

  if (itemTerms.length === 0) {
    return true;
  }

  const supportedTermCount = itemTerms.filter((term) =>
    getTermVariants(term).some((variant) => sourceText.includes(variant)),
  ).length;

  return supportedTermCount >= Math.min(3, itemTerms.length) || supportedTermCount / itemTerms.length >= 0.28;
}
