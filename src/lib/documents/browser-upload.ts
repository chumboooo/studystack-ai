"use client";

import { createClient } from "@/lib/supabase/client";
import {
  isAllowedPdfMetadata,
  PDF_MIME_TYPE,
  sanitizeUploadFileName,
} from "@/lib/documents/upload-validation";

type BrowserUploadArgs = {
  userId: string;
  bucket: string;
  file: File;
  title?: string;
};

type BrowserUploadResult =
  | { ok: true; message: string }
  | {
      ok: false;
      error: string;
    };

async function cleanupUploadedFile(bucket: string, filePath: string) {
  try {
    const supabase = createClient();
    await supabase.storage.from(bucket).remove([filePath]);
  } catch {
    // Best-effort cleanup only.
  }
}

export async function uploadPdfFromBrowser({
  userId,
  bucket,
  file,
  title = "",
}: BrowserUploadArgs): Promise<BrowserUploadResult> {
  if (
    !isAllowedPdfMetadata({
      fileName: file.name,
      mimeType: file.type || PDF_MIME_TYPE,
      fileSize: file.size,
    })
  ) {
    return {
      ok: false,
      error: "Choose a valid PDF within the current upload limit.",
    };
  }

  const supabase = createClient();
  const safeFileName = sanitizeUploadFileName(file.name);
  const filePath = `${userId}/${crypto.randomUUID()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
    contentType: PDF_MIME_TYPE,
    upsert: false,
  });

  if (uploadError) {
    return {
      ok: false,
      error: uploadError.message.includes("maximum allowed size")
        ? "That PDF is larger than the current upload limit."
        : "The PDF could not be uploaded. Please try again.",
    };
  }

  try {
    const response = await fetch("/api/documents/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        fileName: file.name,
        filePath,
        fileSize: file.size,
        mimeType: file.type || PDF_MIME_TYPE,
      }),
    });

    const result = (await response.json()) as {
      ok?: boolean;
      error?: string;
      message?: string;
    };

    if (!response.ok || result.ok === false) {
      await cleanupUploadedFile(bucket, filePath);

      return {
        ok: false,
        error: result.error ?? "The uploaded PDF could not be prepared.",
      };
    }

    return {
      ok: true,
      message: result.message ?? "PDF uploaded successfully.",
    };
  } catch {
    await cleanupUploadedFile(bucket, filePath);

    return {
      ok: false,
      error: "The upload could not be completed. Please try again.",
    };
  }
}
