"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { uploadPdfFromBrowser } from "@/lib/documents/browser-upload";
import {
  isAllowedPdfMetadata,
  MAX_PDF_UPLOAD_BYTES,
  PDF_MIME_TYPE,
} from "@/lib/documents/upload-validation";

function buildUploadResultUrl(pathname: string, params: Record<string, string>) {
  return `${pathname}?${new URLSearchParams(params).toString()}`;
}

export function UploadDocumentForm({
  userId,
  bucket,
  redirectPath = "/documents",
}: {
  userId: string;
  bucket: string;
  redirectPath?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = () => {
    const fileEntry = fileInputRef.current?.files?.[0];
    const title = titleInputRef.current?.value.trim() ?? "";

    if (!(fileEntry instanceof File) || fileEntry.size === 0) {
      setErrorMessage("Please choose a PDF file to upload.");
      setStatusMessage(null);
      return;
    }

    if (
      !isAllowedPdfMetadata({
        fileName: fileEntry.name,
        mimeType: fileEntry.type || PDF_MIME_TYPE,
        fileSize: fileEntry.size,
      })
    ) {
      setErrorMessage("Only PDF uploads are supported right now.");
      setStatusMessage(null);
      return;
    }

    startTransition(async () => {
      setErrorMessage(null);
      setStatusMessage("Uploading your PDF...");

      setStatusMessage("Preparing your document...");
      const result = await uploadPdfFromBrowser({
        userId,
        bucket,
        file: fileEntry,
        title,
      });

      if (!result.ok) {
        setStatusMessage(null);
        setErrorMessage(result.error);
        router.push(
          buildUploadResultUrl(redirectPath, {
            error: result.error,
          }),
        );
        router.refresh();
        return;
      }

      if (titleInputRef.current) {
        titleInputRef.current.value = "";
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setStatusMessage(null);
      setErrorMessage(null);
      router.push(
        buildUploadResultUrl(redirectPath, {
          message: result.message,
        }),
      );
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-200">Title</span>
        <input
          ref={titleInputRef}
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
          ref={fileInputRef}
          name="file"
          type="file"
          accept="application/pdf,.pdf"
          required
          disabled={isPending}
          className="block w-full rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-4 text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-300 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-950 hover:file:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
        />
        <p className="text-xs text-slate-500">
          PDF only. Maximum file size is {Math.floor(MAX_PDF_UPLOAD_BYTES / 1024 / 1024)} MB.
        </p>
      </label>

      {statusMessage ? <AlertBanner tone="info">{statusMessage}</AlertBanner> : null}
      {errorMessage ? <AlertBanner tone="error">{errorMessage}</AlertBanner> : null}

      <div className="flex justify-end">
        <Button type="button" disabled={isPending} aria-disabled={isPending} onClick={handleUpload}>
          {isPending ? "Uploading..." : "Upload PDF"}
        </Button>
      </div>
    </div>
  );
}
