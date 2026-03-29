"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { chunkExtractedText } from "@/lib/pdf/chunk-text";
import { extractPdfText } from "@/lib/pdf/extract-text";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_BUCKET = "documents";

function buildRedirect(params: Record<string, string>) {
  return `/documents?${new URLSearchParams(params).toString()}`;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

function getDocumentTitle(fileName: string) {
  return fileName.replace(/\.pdf$/i, "").trim();
}

function formatActionError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

async function deleteStoredDocumentFile({
  documentId,
  redirectTo,
}: {
  documentId: string;
  redirectTo: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: document, error: fetchError } = await supabase
    .from("documents")
    .select("id, title, file_path")
    .eq("id", documentId)
    .maybeSingle();

  if (fetchError) {
    redirect(
      buildRedirect({
        error: fetchError.message,
      }),
    );
  }

  if (!document) {
    redirect(
      buildRedirect({
        error: "That document could not be found or does not belong to this account.",
      }),
    );
  }

  const bucket = process.env.SUPABASE_DOCUMENTS_BUCKET || DEFAULT_BUCKET;
  const { error: storageDeleteError } = await supabase.storage.from(bucket).remove([document.file_path]);

  if (storageDeleteError) {
    redirect(
      buildRedirect({
        error: storageDeleteError.message,
      }),
    );
  }

  const { error: deleteError } = await supabase.from("documents").delete().eq("id", document.id);

  if (deleteError) {
    redirect(
      buildRedirect({
        error: deleteError.message,
      }),
    );
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${document.id}`);

  redirect(
    `${redirectTo}?${new URLSearchParams({
      message: `"${document.title}" was deleted successfully.`,
    }).toString()}`,
  );
}

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const title = String(formData.get("title") ?? "").trim();
  const fileEntry = formData.get("file");

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    redirect(
      buildRedirect({
        error: "Please choose a PDF file to upload.",
      }),
    );
  }

  const isPdf =
    fileEntry.type === "application/pdf" || fileEntry.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    redirect(
      buildRedirect({
        error: "Only PDF uploads are supported right now.",
      }),
    );
  }

  const bucket = process.env.SUPABASE_DOCUMENTS_BUCKET || DEFAULT_BUCKET;
  const safeFileName = sanitizeFileName(fileEntry.name);
  const filePath = `${user.id}/${crypto.randomUUID()}-${safeFileName}`;
  const documentTitle = title || getDocumentTitle(fileEntry.name);

  const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, fileEntry, {
    contentType: "application/pdf",
    upsert: false,
  });

  if (uploadError) {
    redirect(
      buildRedirect({
        error: uploadError.message,
      }),
    );
  }

  const { data: document, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      title: documentTitle,
      file_name: fileEntry.name,
      file_path: filePath,
      file_size: fileEntry.size,
      mime_type: "application/pdf",
    })
    .select("id")
    .single();

  if (insertError) {
    await supabase.storage.from(bucket).remove([filePath]);

    redirect(
      buildRedirect({
        error: insertError.message,
      }),
    );
  }

  const { error: contentInsertError } = await supabase.from("document_contents").insert({
    document_id: document.id,
    user_id: user.id,
    extraction_status: "pending",
  });

  if (contentInsertError) {
    await supabase.from("documents").delete().eq("id", document.id);
    await supabase.storage.from(bucket).remove([filePath]);

    redirect(
      buildRedirect({
        error: contentInsertError.message,
      }),
    );
  }

  let successMessage = "PDF uploaded and text extracted successfully.";

  try {
    const extraction = await extractPdfText(await fileEntry.arrayBuffer());
    const chunks = chunkExtractedText(extraction.rawText);

    const { error: deleteChunksError } = await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", document.id)
      .eq("user_id", user.id);

    if (deleteChunksError) {
      throw deleteChunksError;
    }

    if (chunks.length > 0) {
      const { error: chunkInsertError } = await supabase.from("document_chunks").insert(
        chunks.map((chunk) => ({
          document_id: document.id,
          user_id: user.id,
          chunk_index: chunk.chunkIndex,
          content: chunk.content,
          character_count: chunk.characterCount,
          metadata: {
            strategy: "paragraph-balanced-v1",
          },
        })),
      );

      if (chunkInsertError) {
        throw chunkInsertError;
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
        error_message: null,
      })
      .eq("document_id", document.id)
      .eq("user_id", user.id);

    if (extractionUpdateError) {
      throw extractionUpdateError;
    }
  } catch (error) {
    const message = formatActionError(error);

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
      .eq("document_id", document.id)
      .eq("user_id", user.id);

    await supabase.from("document_chunks").delete().eq("document_id", document.id).eq("user_id", user.id);

    successMessage = "PDF uploaded, but text extraction failed for this document.";
  }

  revalidatePath("/documents");
  redirect(
    buildRedirect({
      message: successMessage,
    }),
  );
}

export async function deleteDocumentFromList(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "").trim();

  if (!documentId) {
    redirect(
      buildRedirect({
        error: "A document id is required to delete a document.",
      }),
    );
  }

  await deleteStoredDocumentFile({
    documentId,
    redirectTo: "/documents",
  });
}

export async function deleteDocumentFromDetail(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/documents").trim() || "/documents";

  if (!documentId) {
    redirect(
      buildRedirect({
        error: "A document id is required to delete a document.",
      }),
    );
  }

  await deleteStoredDocumentFile({
    documentId,
    redirectTo,
  });
}
