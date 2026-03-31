"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

function buildDocumentsUrl(params: Record<string, string>) {
  return `/documents?${new URLSearchParams(params).toString()}`;
}

export function UploadDocumentForm({
  userId,
  bucket,
}: {
  userId: string;
  bucket: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);
        const title = String(formData.get("title") ?? "").trim();
        const fileEntry = formData.get("file");

        if (!(fileEntry instanceof File) || fileEntry.size === 0) {
          setErrorMessage("Please choose a PDF file to upload.");
          setStatusMessage(null);
          return;
        }

        const isPdf =
          fileEntry.type === "application/pdf" || fileEntry.name.toLowerCase().endsWith(".pdf");

        if (!isPdf) {
          setErrorMessage("Only PDF uploads are supported right now.");
          setStatusMessage(null);
          return;
        }

        startTransition(async () => {
          setErrorMessage(null);
          setStatusMessage("Uploading your PDF...");

          const supabase = createClient();
          const safeFileName = sanitizeFileName(fileEntry.name);
          const filePath = `${userId}/${crypto.randomUUID()}-${safeFileName}`;
          const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, fileEntry, {
            contentType: "application/pdf",
            upsert: false,
          });

          if (uploadError) {
            setStatusMessage(null);
            setErrorMessage(
              uploadError.message.includes("maximum allowed size")
                ? "This PDF is larger than the current upload limit for your storage bucket."
                : uploadError.message,
            );
            return;
          }

          setStatusMessage("Preparing your document...");

          try {
            const response = await fetch("/api/documents/upload", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                title,
                fileName: fileEntry.name,
                filePath,
                fileSize: fileEntry.size,
                mimeType: fileEntry.type || "application/pdf",
              }),
            });

            const result = (await response.json()) as {
              ok?: boolean;
              error?: string;
              message?: string;
            };

            if (!response.ok || result.ok === false) {
              setStatusMessage(null);
              setErrorMessage(result.error ?? "The uploaded PDF could not be processed.");
              router.push(
                buildDocumentsUrl({
                  error: result.error ?? "The uploaded PDF could not be processed.",
                }),
              );
              router.refresh();
              return;
            }

            form.reset();
            setStatusMessage(null);
            setErrorMessage(null);
            router.push(
              buildDocumentsUrl({
                message: result.message ?? "PDF uploaded successfully.",
              }),
            );
            router.refresh();
          } catch (error) {
            setStatusMessage(null);
            setErrorMessage(error instanceof Error ? error.message : String(error));
          }
        });
      }}
    >
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-200">Title</span>
        <input
          name="title"
          type="text"
          placeholder="Biology Chapter 3 Notes"
          className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
        />
        <p className="text-xs text-slate-500">
          Optional. If left blank, the title will be generated from the file name.
        </p>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-200">PDF file</span>
        <input
          name="file"
          type="file"
          accept="application/pdf,.pdf"
          required
          disabled={isPending}
          className="block w-full rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-4 text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-300 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-950 hover:file:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
        />
        <p className="text-xs text-slate-500">
          PDF only. Larger files now upload directly to your private document storage before processing begins.
        </p>
      </label>

      {statusMessage ? <AlertBanner tone="info">{statusMessage}</AlertBanner> : null}
      {errorMessage ? <AlertBanner tone="error">{errorMessage}</AlertBanner> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} aria-disabled={isPending}>
          {isPending ? "Uploading..." : "Upload PDF"}
        </Button>
      </div>
    </form>
  );
}
