import { embedTexts, serializeEmbedding } from "@/lib/openai/embeddings";
import { buildStructuredDocument } from "@/lib/documents/structure";
import { extractPdfText } from "@/lib/pdf/extract-text";
import { logRetrievalDiagnostic } from "@/lib/debug/retrieval-diagnostics";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const DEFAULT_DOCUMENTS_BUCKET = "documents";

export function sanitizeDocumentFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

export function getDocumentTitleFromFileName(fileName: string) {
  return fileName.replace(/\.pdf$/i, "").trim();
}

export function formatDocumentProcessingError(error: unknown) {
  if (error instanceof Error && error.message.toLowerCase().includes("password")) {
    return "This PDF appears to be password-protected.";
  }

  return "StudyStack could not read this PDF clearly enough to prepare it.";
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
      structured_content: {},
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

  await supabase
    .from("document_sections")
    .delete()
    .eq("document_id", documentId)
    .eq("user_id", userId);

  try {
    const extraction = await extractPdfText(sourceBuffer);
    const { data: document } = await supabase
      .from("documents")
      .select("title")
      .eq("id", documentId)
      .eq("user_id", userId)
      .maybeSingle();
    const structuredDocument = buildStructuredDocument({
      title: document?.title ?? "Untitled document",
      rawText: extraction.rawText,
      pages: extraction.pages,
    });
    const chunks = structuredDocument.chunks;
    let embeddingErrorMessage: string | null = null;

    logRetrievalDiagnostic("pdf.extracted", {
      documentId,
      pageCount: extraction.pageCount,
      nonEmptyPages: extraction.pages.filter((page) => page.text.trim().length > 0).length,
      rawTextLength: extraction.rawText.length,
      chunkCount: chunks.length,
      chunkPageSpans: chunks.map((chunk) => ({
        index: chunk.chunkIndex,
        characters: chunk.characterCount,
        pageStart: chunk.metadata.page_start ?? null,
        pageEnd: chunk.metadata.page_end ?? null,
        heading: chunk.metadata.heading ?? null,
        nodeIndex: chunk.metadata.node_index ?? null,
      })),
    });

    if (structuredDocument.nodes.length > 0) {
      const { error: sectionsInsertError } = await supabase.from("document_sections").insert(
        structuredDocument.nodes.map((node) => ({
          document_id: documentId,
          user_id: userId,
          node_index: node.nodeIndex,
          parent_node_index: node.parentNodeIndex,
          node_type: node.nodeType,
          title: node.title,
          content: node.content,
          page_start: node.pageStart,
          page_end: node.pageEnd,
          metadata: node.metadata,
        })),
      );

      if (sectionsInsertError) {
        throw sectionsInsertError;
      }
    }

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
            metadata: chunk.metadata,
          })),
        )
        .select("id, chunk_index, content");

      if (chunkInsertError) {
        throw chunkInsertError;
      }

      logRetrievalDiagnostic("pdf.chunks_stored", {
        documentId,
        insertedChunkCount: insertedChunks.length,
        firstChunkIndex: insertedChunks[0]?.chunk_index ?? null,
        lastChunkIndex: insertedChunks.at(-1)?.chunk_index ?? null,
      });

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
                  ...(chunks[index]?.metadata ?? { strategy: "page-aware-v1" }),
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
      } catch {
        embeddingErrorMessage = "This document is ready, but some study helpers may be less accurate.";
      }
    }

    const { error: extractionUpdateError } = await supabase
      .from("document_contents")
      .update({
        extraction_status: "completed",
        chunk_count: chunks.length,
        raw_text: extraction.rawText,
        structured_content: structuredDocument,
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
        ? `PDF uploaded and ready. ${embeddingErrorMessage}`
        : "PDF uploaded and ready to study.",
    };
  } catch (error) {
    const message = formatDocumentProcessingError(error);

    await supabase
      .from("document_contents")
      .update({
        extraction_status: "failed",
        chunk_count: 0,
        raw_text: "",
        structured_content: {},
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

    await supabase
      .from("document_sections")
      .delete()
      .eq("document_id", documentId)
      .eq("user_id", userId);

    return {
      ok: false as const,
      message,
    };
  }
}
