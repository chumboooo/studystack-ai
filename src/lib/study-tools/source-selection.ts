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
const INTRO_PATTERNS = [
  /\b(introduction|intro|overview|packet overview|chapter overview)\b/i,
  /\b(learning objectives|key topics|topics covered|topic list|study guide)\b/i,
  /\b(suggested questions|review questions|practice questions)\b/i,
];
const EXPLANATORY_PATTERNS = [
  /\b(is|are|refers to|defined as|means|consists of)\b/i,
  /\b(because|therefore|thus|as a result|which makes|this makes)\b/i,
  /\b(works by|uses|stores|maps|points to|allows|provides|supports)\b/i,
  /\b(reliable|ordered|unordered|connectionless|connection-oriented)\b/i,
  /\b(primary key|foreign key|index|transaction|hash table|linked list|thread|process)\b/i,
];
const COMPARISON_PATTERNS =
  /\b(compare|comparison|difference|different|versus|vs|whereas|while|however|unlike|contrast)\b/i;

export type StudySourceChunk = RetrievalChunk;

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

export function scoreStudyChunk({
  chunk,
  queryText,
}: {
  chunk: StudySourceChunk;
  queryText: string;
}) {
  const normalizedContent = chunk.content.toLowerCase();
  const queryTerms = buildStudyQueryTerms(queryText);
  const termCoverage =
    queryTerms.length > 0
      ? queryTerms.filter((term) => normalizedContent.includes(term)).length / queryTerms.length
      : 0;
  const termDensity =
    queryTerms.length > 0
      ? Math.min(
          queryTerms.reduce(
            (score, term) => score + (normalizedContent.match(new RegExp(term, "g"))?.length ?? 0),
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

  return (
    chunk.rank * 1.6 +
    termCoverage * 4.8 +
    termDensity * 0.7 +
    explanatoryBonus +
    Math.min(punctuationCount / 5, 1.1) +
    comparisonBonus -
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
    }))
    .sort((left, right) => right.score - left.score);

  const filtered =
    ranked.length > limit
      ? ranked.filter((entry, index) => entry.score >= 1.4 || index < Math.max(2, limit))
      : ranked;

  return filtered.slice(0, limit).map((entry) => ({
    ...entry.chunk,
    rank: Math.max(entry.chunk.rank, entry.score),
  }));
}
