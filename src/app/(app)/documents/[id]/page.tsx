import {
  deleteDocumentFromDetail,
  renameDocumentFromDetail,
  reprocessDocumentFromDetail,
} from "@/app/(app)/documents/actions";
import { DeleteDocumentForm } from "@/components/documents/delete-document-button";
import { DocumentStatusBadge, getDocumentStatusLabel } from "@/components/documents/document-status-badge";
import { ReprocessDocumentForm } from "@/components/documents/reprocess-document-button";
import { DocumentTitleForm } from "@/components/documents/document-title-form";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { buildDocumentFileUrl, formatDocumentDate, formatFileSize } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

type DocumentDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    chunk?: string;
    error?: string;
    message?: string;
  }>;
};

function getChunkPreview(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (normalized.length <= 360) {
    return normalized;
  }

  return `${normalized.slice(0, 357)}...`;
}

export default async function DocumentDetailPage({
  params,
  searchParams,
}: DocumentDetailPageProps) {
  const [{ id }, { chunk, error: pageError, message }, supabase] = await Promise.all([
    params,
    searchParams,
    createClient(),
  ]);
  const selectedChunkIndex = Number.isFinite(Number(chunk)) ? Number(chunk) : null;

  const { data: document, error } = await supabase
    .from("documents")
    .select(
      "id, title, file_name, file_path, file_size, mime_type, created_at, document_contents(extraction_status, page_count, chunk_count, raw_text, error_message), document_chunks(id, chunk_index, content, character_count, created_at)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <div className="space-y-8">
        <PageHeader
          badge="Document"
          title="Document detail"
          description="StudyStack could not load that document right now."
          actions={<Button href="/documents">Back to documents</Button>}
        />

        <Card className="space-y-3">
          <CardTitle>Document detail is unavailable</CardTitle>
          <CardDescription>Please refresh and try again.</CardDescription>
        </Card>
      </div>
    );
  }

  if (!document) {
    notFound();
  }

  const content = Array.isArray(document.document_contents)
    ? document.document_contents[0]
    : document.document_contents;
  const chunks = Array.isArray(document.document_chunks)
    ? [...document.document_chunks].sort((a, b) => a.chunk_index - b.chunk_index)
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Document"
        title={document.title}
        description="Review the document text, source sections, and study options for this file."
        actions={
          <>
            <Button href="/documents" variant="secondary">
              Back to documents
            </Button>
            <Button href="/chat">Ask questions</Button>
            <Button
              href={buildDocumentFileUrl(document.id, "view")}
              variant="secondary"
              external
              target="_blank"
              rel="noreferrer"
            >
              View PDF
            </Button>
            <Button
              href={buildDocumentFileUrl(document.id, "download")}
              variant="secondary"
              external
            >
              Download PDF
            </Button>
            <ReprocessDocumentForm
              action={reprocessDocumentFromDetail}
              documentId={document.id}
              redirectTo={`/documents/${document.id}`}
              label="Refresh document"
              pendingLabel="Refreshing..."
              className="justify-center border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20"
            />
            <DeleteDocumentForm
              action={deleteDocumentFromDetail}
              documentId={document.id}
              redirectTo="/documents"
              confirmMessage={`Delete "${document.title}" and its saved study data? This cannot be undone.`}
              label="Delete document"
              pendingLabel="Deleting..."
              className="justify-center border border-rose-400/20 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20"
            />
          </>
        }
      />

      {pageError ? <AlertBanner tone="error">{pageError}</AlertBanner> : null}

      {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}
      {selectedChunkIndex !== null ? (
        <AlertBanner tone="info">
          Opened section {selectedChunkIndex + 1}. It is highlighted below.
        </AlertBanner>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-5">
          <Card className="space-y-5">
            <div className="space-y-2">
              <CardTitle>Document details</CardTitle>
              <CardDescription>
                Everything on this page belongs to your account and is shown only for this document.
              </CardDescription>
            </div>

            <div className="grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <DocumentStatusBadge status={content?.extraction_status} />
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {getDocumentStatusLabel(content?.extraction_status)}
                  </span>
                </div>
                <div className="mt-4">
                  <DocumentTitleForm
                    action={renameDocumentFromDetail}
                    documentId={document.id}
                    initialTitle={document.title}
                    redirectTo={`/documents/${document.id}`}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-400">File name</p>
                <p className="mt-2 break-all text-base font-medium text-white">
                  {document.file_name}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-slate-400">File type</p>
                  <p className="mt-2 text-base font-medium text-white">
                    {document.mime_type === "application/pdf" ? "PDF" : document.mime_type}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-slate-400">File size</p>
                  <p className="mt-2 text-base font-medium text-white">
                    {formatFileSize(document.file_size)}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-slate-400">Created</p>
                  <p className="mt-2 text-base font-medium text-white">
                    {formatDocumentDate(document.created_at)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-slate-400">Ready to use</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <DocumentStatusBadge status={content?.extraction_status} />
                    <span className="text-sm text-slate-400">
                      {content?.extraction_status === "completed"
                        ? "Ready to use in chat, flashcards, and quizzes."
                        : content?.extraction_status === "failed"
                          ? "Last attempt failed."
                          : "Still preparing this file."}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-slate-400">Page count</p>
                  <p className="mt-2 text-base font-medium text-white">
                    {content?.page_count ?? "Not available yet"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-slate-400">Section count</p>
                  <p className="mt-2 text-base font-medium text-white">
                    {content?.chunk_count ?? chunks.length}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <p className="text-sm font-medium text-slate-100">Original file</p>
                <p className="mt-2 break-all text-sm leading-6 text-slate-400">
                  {document.file_name}
                </p>
              </div>

              {content?.extraction_status === "failed" && content.error_message ? (
                <AlertBanner tone="error" className="p-5">
                  {content.error_message}
                </AlertBanner>
              ) : null}
            </div>
          </Card>

          {content?.raw_text ? (
            <Card className="space-y-5">
              <div>
                <CardTitle>Document text</CardTitle>
                <CardDescription>
                  The full readable text captured from this file.
                </CardDescription>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                <div className="max-h-[34rem] overflow-y-auto rounded-[1.1rem] bg-slate-950/70 p-5">
                  <div className="mb-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <span>Readable text</span>
                    <span>{content.page_count ?? "?"} pages</span>
                    <span>{content.chunk_count ?? chunks.length} sections</span>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm leading-8 text-slate-200">
                    {content.raw_text}
                  </pre>
                </div>
              </div>
            </Card>
          ) : (
            <EmptyState
              eyebrow="Document text"
              title="No document text is available yet."
              description="If this file is still being prepared, refresh this page later. If preparation failed, the message above should explain what happened."
              actionLabel="Back to documents"
              actionHref="/documents"
              secondaryActionLabel="Ask questions"
              secondaryActionHref="/chat"
              icon={
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                  <path d="M7 3.75h7l5 5V20.25A1.75 1.75 0 0 1 17.25 22h-10.5A1.75 1.75 0 0 1 5 20.25V5.5A1.75 1.75 0 0 1 6.75 3.75Z" />
                  <path d="M14 3.75v5h5M8 12h8M8 16h5" />
                </svg>
              }
            />
          )}
        </div>

        {chunks.length > 0 ? (
          <Card className="space-y-5">
            <div>
              <CardTitle>Source sections</CardTitle>
              <CardDescription>
                Saved sections from this document, shown in reading order.
              </CardDescription>
            </div>

            <div className="grid gap-4">
              {chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  id={`chunk-${chunk.chunk_index}`}
                  className={`scroll-mt-28 rounded-2xl border p-5 transition-colors ${
                    selectedChunkIndex === chunk.chunk_index
                      ? "border-cyan-300/30 bg-cyan-300/10 shadow-[0_0_0_1px_rgba(103,232,249,0.08)]"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
                        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                          Section {chunk.chunk_index + 1}
                        </span>
                        <span>{formatDocumentDate(chunk.created_at)}</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                        Preview
                      </p>
                      <p className="mt-3 text-sm leading-7 text-slate-200">
                        {getChunkPreview(chunk.content)}
                      </p>
                    </div>

                    <details className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <summary className="cursor-pointer text-sm font-medium text-white">
                        View full section
                      </summary>
                      <div className="mt-4 border-t border-white/10 pt-4">
                        <pre className="whitespace-pre-wrap text-sm leading-8 text-slate-300">
                          {chunk.content}
                        </pre>
                      </div>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <EmptyState
            eyebrow="Source sections"
            title="No source sections are available yet for this document."
            description="Sections appear after the file finishes getting ready. If preparation failed or is still in progress, this list will stay empty for now."
            actionLabel="Back to documents"
            actionHref="/documents"
            secondaryActionLabel="Ask questions"
            secondaryActionHref="/chat"
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                <path d="M5 7.75A1.75 1.75 0 0 1 6.75 6h4.5A1.75 1.75 0 0 1 13 7.75v4.5A1.75 1.75 0 0 1 11.25 14h-4.5A1.75 1.75 0 0 1 5 12.25Z" />
                <path d="M11 10h8M15 6v8M15 18h4" />
              </svg>
            }
          />
        )}
      </div>
    </div>
  );
}
