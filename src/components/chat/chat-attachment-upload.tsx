"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadPdfFromBrowser } from "@/lib/documents/browser-upload";
import { isAllowedPdfMetadata, PDF_MIME_TYPE } from "@/lib/documents/upload-validation";

type ChatAttachmentUploadProps = {
  userId: string;
  bucket: string;
};

export function ChatAttachmentUpload({ userId, bucket }: ChatAttachmentUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function uploadFile(fileEntry: File) {
    if (
      !isAllowedPdfMetadata({
        fileName: fileEntry.name,
        mimeType: fileEntry.type || PDF_MIME_TYPE,
        fileSize: fileEntry.size,
      })
    ) {
      setStatus(null);
      setError("Choose a PDF to attach.");
      return;
    }

    startTransition(async () => {
      setError(null);
      setStatus("Uploading PDF...");

      setStatus("Preparing PDF...");
      const result = await uploadPdfFromBrowser({
        userId,
        bucket,
        file: fileEntry,
      });

      if (!result.ok) {
        setStatus(null);
        setError(result.error);
        router.refresh();
        return;
      }

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      setStatus("PDF attached. Ask a question when ready.");
      setError(null);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        disabled={isPending}
        onChange={(event) => {
          const fileEntry = event.currentTarget.files?.[0];

          if (fileEntry) {
            uploadFile(fileEntry);
          }
        }}
      />
      <button
        type="button"
        disabled={isPending}
        aria-label="Attach a PDF"
        title="Attach a PDF"
        onClick={() => inputRef.current?.click()}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-xl leading-none text-slate-200 transition-colors hover:border-cyan-300/40 hover:bg-white/10 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "..." : "+"}
      </button>
      {(status || error) && (
        <p
          className={`absolute bottom-full left-0 mb-2 w-64 rounded-2xl border px-3 py-2 text-xs shadow-[0_14px_40px_rgba(2,6,23,0.35)] ${
            error
              ? "border-rose-400/20 bg-rose-400/10 text-rose-100"
              : "border-cyan-300/20 bg-slate-950 text-cyan-100"
          }`}
        >
          {error ?? status}
        </p>
      )}
    </div>
  );
}
