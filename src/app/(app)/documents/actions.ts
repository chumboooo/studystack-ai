"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  DEFAULT_DOCUMENTS_BUCKET,
  runDocumentExtraction,
} from "@/lib/documents/processing";
import { createClient } from "@/lib/supabase/server";

function buildRedirect(params: Record<string, string>) {
  return `/documents?${new URLSearchParams(params).toString()}`;
}

function buildScopedRedirect(path: string, params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  return query ? `${path}?${query}` : path;
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

  const bucket = process.env.SUPABASE_DOCUMENTS_BUCKET || DEFAULT_DOCUMENTS_BUCKET;
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

  const bucket = process.env.SUPABASE_DOCUMENTS_BUCKET || DEFAULT_DOCUMENTS_BUCKET;
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
          message: `"${document.title}" was reprocessed successfully. ${result.message}`,
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
