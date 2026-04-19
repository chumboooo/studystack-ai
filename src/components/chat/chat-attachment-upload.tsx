"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  isAllowedPdfMetadata,
  PDF_MIME_TYPE,
  sanitizeUploadFileName,
} from "@/lib/documents/upload-validation";

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

      const supabase = createClient();
      const safeFileName = sanitizeUploadFileName(fileEntry.name);
      const filePath = `${userId}/${crypto.randomUUID()}-${safeFileName}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, fileEntry, {
        contentType: PDF_MIME_TYPE,
        upsert: false,
      });

      if (uploadError) {
        setStatus(null);
        setError(
          uploadError.message.includes("maximum allowed size")
            ? "That PDF is larger than the current upload limit."
            : "The PDF could not be uploaded. Please try again.",
        );
        return;
      }

      setStatus("Preparing PDF...");

      try {
        const response = await fetch("/api/documents/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "",
            fileName: fileEntry.name,
            filePath,
            fileSize: fileEntry.size,
            mimeType: fileEntry.type || PDF_MIME_TYPE,
          }),
        });

        const result = (await response.json()) as {
          ok?: boolean;
          error?: string;
          message?: string;
        };

        if (!response.ok || result.ok === false) {
          setStatus(null);
          setError(result.error ?? "The uploaded PDF could not be prepared.");
          router.refresh();
          return;
        }

        if (inputRef.current) {
          inputRef.current.value = "";
        }

        setStatus("PDF attached. Ask a question when ready.");
        setError(null);
        router.refresh();
      } catch {
        setStatus(null);
        setError("The upload could not be completed. Please try again.");
      }
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
