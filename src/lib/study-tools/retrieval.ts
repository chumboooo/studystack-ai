import { retrieveGroundingChunks } from "@/lib/chat/retrieve-grounding";
import type { RetrievalChunk } from "@/lib/chat/grounded-answer";
import { selectStudyChunks } from "@/lib/study-tools/source-selection";
import type { createClient } from "@/lib/supabase/server";

export type StudyChunk = RetrievalChunk;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type DocumentChunkRow = {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  character_count: number;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

const GENERIC_RETRIEVAL_WORDS = new Set([
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

function buildQueryCandidates(queryText: string) {
  const normalized = queryText.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return [];
  }

  const stripped = normalized
    .split(/\s+/)
    .filter((word) => !GENERIC_RETRIEVAL_WORDS.has(word.toLowerCase()))
    .join(" ")
    .trim();

  return Array.from(new Set([stripped, normalized].filter(Boolean)));
}

function mergeContextWindow({
  chunk,
  chunkMap,
}: {
  chunk: StudyChunk;
  chunkMap: Map<number, StudyChunk>;
}) {
  const windowContent = [chunk.chunk_index - 1, chunk.chunk_index, chunk.chunk_index + 1]
    .filter((index) => index >= 0)
    .map((index) => chunkMap.get(index)?.content ?? "")
    .map((content) => content.trim())
    .filter(Boolean)
    .join("\n\n");

  return {
    ...chunk,
    content: windowContent || chunk.content,
    character_count: windowContent.length || chunk.character_count,
  };
}

export async function retrieveStudyChunks({
  supabase,
  queryText,
  documentId,
  matchCount,
}: {
  supabase: SupabaseServerClient;
  queryText: string;
  documentId: string;
  matchCount: number;
}): Promise<{
  chunks: StudyChunk[];
  titleHint: string;
  sourceMode: "document" | "retrieval";
  documentId: string | null;
}> {
  const normalizedQuery = queryText.trim();

  if (documentId) {
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("id, title")
      .eq("id", documentId)
      .maybeSingle();

    if (documentError || !document) {
      throw new Error("That document could not be found.");
    }

    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("id, document_id, chunk_index, content, character_count, created_at, metadata")
      .eq("document_id", documentId)
      .order("chunk_index", { ascending: true })
      .limit(600);

    if (chunksError) {
      throw new Error("StudyStack could not read that document.");
    }

    const studyChunks = ((chunks ?? []) as DocumentChunkRow[]).map((chunk) => ({
      chunk_id: chunk.id,
      document_id: chunk.document_id,
      document_title: document.title,
      chunk_index: chunk.chunk_index,
      content: chunk.content,
      character_count: chunk.character_count,
      created_at: chunk.created_at,
      metadata: chunk.metadata,
      rank: 0,
    }));
    const chunkMap = new Map<number, StudyChunk>(studyChunks.map((chunk) => [chunk.chunk_index, chunk]));
    const candidateMap = new Map<string, StudyChunk>(studyChunks.map((chunk) => [chunk.chunk_id, chunk]));

    if (normalizedQuery) {
      try {
        const hybridChunks = await retrieveGroundingChunks({
          supabase,
          question: normalizedQuery,
        });

        for (const chunk of hybridChunks.filter((entry) => entry.document_id === documentId)) {
          candidateMap.set(chunk.chunk_id, chunk);
        }
      } catch {
        // Full-document local ranking below keeps selected-document generation available.
      }
    }

    const rankedChunks = selectStudyChunks({
      chunks: Array.from(candidateMap.values()),
      queryText: normalizedQuery || document.title,
      limit: Math.max(matchCount * 2, 12),
    }).map((chunk) =>
      mergeContextWindow({
        chunk,
        chunkMap,
      }),
    );

    return {
      chunks: rankedChunks,
      titleHint: document.title,
      sourceMode: "document",
      documentId: document.id,
    };
  }

  if (!normalizedQuery) {
    throw new Error("Add a topic or choose a document first.");
  }
  const queryCandidates = buildQueryCandidates(normalizedQuery);
  let lastError: Error | null = null;
  let chunks: StudyChunk[] = [];
  let titleHint = queryCandidates[0] ?? normalizedQuery;

  for (const candidate of queryCandidates) {
    try {
      const retrieved = await retrieveGroundingChunks({
        supabase,
        question: candidate,
      });

      if (retrieved.length > 0) {
        chunks = selectStudyChunks({
          chunks: retrieved,
          queryText: candidate,
          limit: Math.max(matchCount, 8),
        });
        titleHint = candidate;
        break;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (lastError && chunks.length === 0) {
    throw lastError;
  }

  return {
    chunks,
    titleHint,
    sourceMode: "retrieval",
    documentId: null,
  };
}
