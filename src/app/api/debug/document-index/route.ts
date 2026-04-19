import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RelatedRow<T> = T | T[] | null;

type DocumentContentDebugRow = {
  extraction_status: string;
  page_count: number | null;
  chunk_count: number | null;
  error_message: string | null;
  extracted_at: string | null;
  raw_text: string;
};

type DocumentChunkDebugRow = {
  id: string;
  chunk_index: number;
  character_count: number;
  created_at: string;
};

type DocumentDebugRow = {
  id: string;
  title: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  document_contents: RelatedRow<DocumentContentDebugRow>;
  document_chunks: RelatedRow<DocumentChunkDebugRow>;
};

function firstRelated<T>(value: RelatedRow<T>) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function relatedArray<T>(value: RelatedRow<T>) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function getIndexState({
  content,
  storedChunkCount,
}: {
  content: DocumentContentDebugRow | null;
  storedChunkCount: number;
}) {
  if (!content) {
    return "document_found_but_no_content_row";
  }

  if (content.extraction_status !== "completed") {
    return "document_found_but_not_completed";
  }

  if (storedChunkCount === 0) {
    return "document_found_but_no_indexed_sections";
  }

  return "document_found_and_indexed";
}

export async function GET(request: Request) {
  if (process.env.STUDYSTACK_RETRIEVAL_DEBUG !== "true") {
    return NextResponse.json(
      {
        state: "debug_disabled",
        error: "Document index inspection is disabled.",
        enable: "Set STUDYSTACK_RETRIEVAL_DEBUG=true on the server to use this endpoint.",
      },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        state: "not_signed_in",
        error: "You must be signed in.",
      },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId")?.trim();
  const query = searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (!documentId) {
    return NextResponse.json(
      {
        state: "missing_document_id",
        error: "documentId is required.",
      },
      { status: 400 },
    );
  }

  const { data, error: documentError } = await supabase
    .from("documents")
    .select(
      "id, title, file_name, file_size, mime_type, created_at, document_contents(extraction_status, page_count, chunk_count, raw_text, error_message, extracted_at), document_chunks(id, chunk_index, character_count, created_at)",
    )
    .eq("id", documentId)
    .maybeSingle();

  const document = data as DocumentDebugRow | null;

  if (documentError) {
    return NextResponse.json(
      {
        state: "document_lookup_failed",
        error: "Document lookup failed.",
        detail: documentError.message,
      },
      { status: 500 },
    );
  }

  if (!document) {
    return NextResponse.json(
      {
        state: "document_not_found_or_not_accessible",
        error: "Document was not found for the signed-in account.",
        note:
          "This uses the same RLS-protected document id lookup as /documents/[id]. If the page opens in another browser session, sign in with the same account here.",
      },
      { status: 404 },
    );
  }

  const content = firstRelated(document.document_contents);
  const relatedChunks = relatedArray(document.document_chunks);
  const { data: indexedChunks, error: chunkError } = await supabase
    .from("document_chunks")
    .select("id, chunk_index, character_count, metadata, content")
    .eq("document_id", document.id)
    .order("chunk_index", { ascending: true })
    .limit(300);

  if (chunkError) {
    return NextResponse.json(
      {
        state: "chunks_lookup_failed",
        error: "Indexed sections could not be loaded.",
        document: {
          id: document.id,
          title: document.title,
        },
        detail: chunkError.message,
      },
      { status: 500 },
    );
  }

  const chunks = indexedChunks ?? [];
  const queryTerms = query
    .split(/[^a-z0-9]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);
  const state = getIndexState({
    content,
    storedChunkCount: chunks.length,
  });

  return NextResponse.json({
    state,
    document: {
      id: document.id,
      title: document.title,
      fileName: document.file_name,
      fileSize: document.file_size,
      mimeType: document.mime_type,
      createdAt: document.created_at,
    },
    content: content
      ? {
          extractionStatus: content.extraction_status,
          pageCount: content.page_count,
          recordedChunkCount: content.chunk_count,
          relatedChunkCountFromDocumentLookup: relatedChunks.length,
          storedChunkCount: chunks.length,
          extractedAt: content.extracted_at,
          errorMessage: content.error_message,
          rawTextLength: content.raw_text.length,
          rawTextContainsQuery: query ? content.raw_text.toLowerCase().includes(query) : null,
        }
      : null,
    chunks: chunks.map((chunk) => {
      const normalizedContent = chunk.content.toLowerCase();

      return {
        id: chunk.id,
        chunkIndex: chunk.chunk_index,
        characterCount: chunk.character_count,
        metadata: chunk.metadata,
        pageStart:
          chunk.metadata && typeof chunk.metadata === "object" && !Array.isArray(chunk.metadata)
            ? chunk.metadata.page_start ?? null
            : null,
        pageEnd:
          chunk.metadata && typeof chunk.metadata === "object" && !Array.isArray(chunk.metadata)
            ? chunk.metadata.page_end ?? null
            : null,
        queryTermMatches: queryTerms.filter((term) => normalizedContent.includes(term)),
        preview: chunk.content.replace(/\s+/g, " ").trim().slice(0, 260),
      };
    }),
  });
}
