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

function buildScopedRedirect(path: string, params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  return query ? `${path}?${query}` : path;
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

async function runDocumentExtraction({
  supabase,
  userId,
  documentId,
  sourceBuffer,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
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

    if (chunks.length > 0) {
      const { error: chunkInsertError } = await supabase.from("document_chunks").insert(
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
      .eq("document_id", documentId)
      .eq("user_id", userId);

    if (extractionUpdateError) {
      throw extractionUpdateError;
    }

    return {
      ok: true as const,
      message: "PDF processed successfully.",
    };
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

async function updateStoredDocumentTitle({
  documentId,
  title,
  redirectTo,
}: {
  documentId: string;
  title: string;
  redirectTo: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const normalizedTitle = title.trim();

  if (!normalizedTitle) {
    redirect(
      buildScopedRedirect(redirectTo, {
        error: "Document title cannot be empty.",
      }),
    );
  }

  const { data: document, error: fetchError } = await supabase
    .from("documents")
    .select("id, title")
    .eq("id", documentId)
    .maybeSingle();

  if (fetchError) {
    redirect(
      buildScopedRedirect(redirectTo, {
        error: fetchError.message,
      }),
    );
  }

  if (!document) {
    redirect(
      buildScopedRedirect(redirectTo, {
        error: "That document could not be found or does not belong to this account.",
      }),
    );
  }

  if (document.title === normalizedTitle) {
    redirect(
      buildScopedRedirect(redirectTo, {
        message: "The document title is already up to date.",
      }),
    );
  }

  const { error: updateError } = await supabase
    .from("documents")
    .update({
      title: normalizedTitle,
    })
    .eq("id", document.id);

  if (updateError) {
    redirect(
      buildScopedRedirect(redirectTo, {
        error: updateError.message,
      }),
    );
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${document.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/chat");

  redirect(
    buildScopedRedirect(redirectTo, {
      message: `Document renamed to "${normalizedTitle}".`,
    }),
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

  const result = await runDocumentExtraction({
    supabase,
    userId: user.id,
    documentId: document.id,
    sourceBuffer: await fileEntry.arrayBuffer(),
  });

  revalidatePath("/documents");
  redirect(
    result.ok
      ? buildRedirect({
          message: "PDF uploaded and text extracted successfully.",
        })
      : buildRedirect({
          error: `PDF uploaded, but text extraction failed for this document. ${result.message}`,
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

async function reprocessStoredDocument({
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
      buildScopedRedirect(redirectTo, {
        error: fetchError.message,
      }),
    );
  }

  if (!document) {
    redirect(
      buildScopedRedirect(redirectTo, {
        error: "That document could not be found or does not belong to this account.",
      }),
    );
  }

  const bucket = process.env.SUPABASE_DOCUMENTS_BUCKET || DEFAULT_BUCKET;
  const { data: downloadedFile, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(document.file_path);

  if (downloadError || !downloadedFile) {
    redirect(
      buildScopedRedirect(redirectTo, {
        error: downloadError?.message ?? "The stored PDF could not be downloaded for reprocessing.",
      }),
    );
  }

  const result = await runDocumentExtraction({
    supabase,
    userId: user.id,
    documentId: document.id,
    sourceBuffer: await downloadedFile.arrayBuffer(),
  });

  revalidatePath("/documents");
  revalidatePath(`/documents/${document.id}`);
  revalidatePath("/chat");

  redirect(
    buildScopedRedirect(redirectTo, result.ok
      ? {
          message: `"${document.title}" was reprocessed successfully.`,
        }
      : {
          error: `Reprocessing failed for "${document.title}". ${result.message}`,
        }),
  );
}

export async function reprocessDocumentFromList(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "").trim();

  if (!documentId) {
    redirect(
      buildRedirect({
        error: "A document id is required to reprocess a document.",
      }),
    );
  }

  await reprocessStoredDocument({
    documentId,
    redirectTo: "/documents",
  });
}

export async function reprocessDocumentFromDetail(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/documents").trim() || "/documents";

  if (!documentId) {
    redirect(
      buildScopedRedirect(redirectTo, {
        error: "A document id is required to reprocess a document.",
      }),
    );
  }

  await reprocessStoredDocument({
    documentId,
    redirectTo,
  });
}

export async function renameDocumentFromList(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "").trim();
  const title = String(formData.get("title") ?? "");

  if (!documentId) {
    redirect(
      buildRedirect({
        error: "A document id is required to rename a document.",
      }),
    );
  }

  await updateStoredDocumentTitle({
    documentId,
    title,
    redirectTo: "/documents",
  });
}

export async function renameDocumentFromDetail(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "").trim();
  const title = String(formData.get("title") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/documents").trim() || "/documents";

  if (!documentId) {
    redirect(
      buildScopedRedirect(redirectTo, {
        error: "A document id is required to rename a document.",
      }),
    );
  }

  await updateStoredDocumentTitle({
    documentId,
    title,
    redirectTo,
  });
}
