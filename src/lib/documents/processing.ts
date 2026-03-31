import { embedTexts, serializeEmbedding } from "@/lib/openai/embeddings";
import { chunkExtractedText } from "@/lib/pdf/chunk-text";
import { extractPdfText } from "@/lib/pdf/extract-text";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const DEFAULT_DOCUMENTS_BUCKET = "documents";

export function sanitizeDocumentFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

export function getDocumentTitleFromFileName(fileName: string) {
  return fileName.replace(/\.pdf$/i, "").trim();
}

export function formatDocumentProcessingError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

export async function runDocumentExtraction({
  supabase,
  userId,
  documentId,
  sourceBuffer,
}: {
  supabase: Awaited<ReturnType<typeof createServerClient>>;
  userId: string;
  documentId: string;
  sourceBuffer: ArrayBuffer;
}) {
  const { error: contentUpsertError } = await supabase
    .from("document_contents")
    .upsert({
      document_id: documentId,
      user_id: userId,
      extraction_status: "pending",
      chunk_count: 0,
      raw_text: "",
      page_count: null,
      extracted_at: null,
      error_message: null,
    });

  if (contentUpsertError) {
    throw contentUpsertError;
  }

  const { error: deleteChunksError } = await supabase
    .from("document_chunks")
    .delete()
    .eq("document_id", documentId)
    .eq("user_id", userId);

  if (deleteChunksError) {
    throw deleteChunksError;
  }

  try {
    const extraction = await extractPdfText(sourceBuffer);
    const chunks = chunkExtractedText(extraction.rawText);
    let embeddingErrorMessage: string | null = null;

    if (chunks.length > 0) {
      const { data: insertedChunks, error: chunkInsertError } = await supabase
        .from("document_chunks")
        .insert(
          chunks.map((chunk) => ({
            document_id: documentId,
            user_id: userId,
            chunk_index: chunk.chunkIndex,
            content: chunk.content,
            character_count: chunk.characterCount,
            metadata: {
              strategy: "paragraph-balanced-v1",
            },
          })),
        )
        .select("id, chunk_index, content");

      if (chunkInsertError) {
        throw chunkInsertError;
      }

      try {
        const embeddings = await embedTexts(insertedChunks.map((chunk) => chunk.content));

        await Promise.all(
          insertedChunks.map(async (chunk, index) => {
            const embedding = embeddings[index];

            if (!embedding || embedding.length === 0) {
              return;
            }

            const { error: embeddingUpdateError } = await supabase
              .from("document_chunks")
              .update({
                embedding: serializeEmbedding(embedding),
                metadata: {
                  strategy: "paragraph-balanced-v1",
                  embedding_model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
                },
              })
              .eq("id", chunk.id)
              .eq("user_id", userId);

            if (embeddingUpdateError) {
              throw embeddingUpdateError;
            }
          }),
        );
      } catch (error) {
        embeddingErrorMessage = `Embeddings were skipped: ${formatDocumentProcessingError(error)}`;
      }
    }

    const { error: extractionUpdateError } = await supabase
      .from("document_contents")
      .update({
        extraction_status: "completed",
        chunk_count: chunks.length,
        raw_text: extraction.rawText,
        page_count: extraction.pageCount,
        extracted_at: new Date().toISOString(),
        error_message: embeddingErrorMessage,
      })
      .eq("document_id", documentId)
      .eq("user_id", userId);

    if (extractionUpdateError) {
      throw extractionUpdateError;
    }

    return {
      ok: true as const,
      message: embeddingErrorMessage
        ? `PDF processed successfully, but semantic embeddings could not be generated. ${embeddingErrorMessage}`
        : "PDF processed successfully.",
    };
  } catch (error) {
    const message = formatDocumentProcessingError(error);

    await supabase
      .from("document_contents")
      .update({
        extraction_status: "failed",
        chunk_count: 0,
        raw_text: "",
        page_count: null,
        extracted_at: null,
        error_message: message,
      })
      .eq("document_id", documentId)
      .eq("user_id", userId);

    await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", documentId)
      .eq("user_id", userId);

    return {
      ok: false as const,
      message,
    };
  }
}
