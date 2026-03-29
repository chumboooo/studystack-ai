import { deleteDocumentFromDetail } from "@/app/(app)/documents/actions";
import { DeleteDocumentForm } from "@/components/documents/delete-document-button";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDocumentDate, formatFileSize } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

type DocumentDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getStatusBadge(status: "completed" | "failed" | "pending" | null | undefined) {
  if (status === "completed") {
    return "rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200";
  }

  if (status === "failed") {
    return "rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-xs text-rose-200";
  }

  return "rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-200";
}

function getStatusLabel(status: "completed" | "failed" | "pending" | null | undefined) {
  if (status === "completed") {
    return "Text extracted";
  }

  if (status === "failed") {
    return "Extraction failed";
  }

  return "Extraction pending";
}

function getChunkPreview(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (normalized.length <= 360) {
    return normalized;
  }

  return `${normalized.slice(0, 357)}...`;
}

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const [{ id }, supabase] = await Promise.all([params, createClient()]);

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
          <CardDescription>{error.message}</CardDescription>
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
        description="Review metadata, extracted text, and retrieval-ready chunks for this document."
        actions={
          <>
            <Button href="/documents" variant="secondary">
              Back to documents
            </Button>
            <Button href="/chat">Search chunks</Button>
            <DeleteDocumentForm
              action={deleteDocumentFromDetail}
              documentId={document.id}
              redirectTo="/documents"
              confirmMessage={`Delete "${document.title}" and all extracted data? This cannot be undone.`}
              label="Delete document"
              pendingLabel="Deleting..."
              className="justify-center border border-rose-400/20 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20"
            />
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-5">
          <Card className="space-y-5">
            <div className="space-y-2">
              <CardTitle>Document metadata</CardTitle>
              <CardDescription>
                This view is scoped to the signed-in user and only loads the selected document and
                its extracted content.
              </CardDescription>
            </div>

            <div className="grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-400">File name</p>
                <p className="mt-2 break-all text-base font-medium text-white">
                  {document.file_name}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-slate-400">MIME type</p>
                  <p className="mt-2 text-base font-medium text-white">{document.mime_type}</p>
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
                  <p className="text-sm text-slate-400">Extraction status</p>
                  <div className="mt-3">
                    <span className={getStatusBadge(content?.extraction_status)}>
                      {getStatusLabel(content?.extraction_status)}
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
                  <p className="text-sm text-slate-400">Chunk count</p>
                  <p className="mt-2 text-base font-medium text-white">
                    {content?.chunk_count ?? chunks.length}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <p className="text-sm font-medium text-slate-100">Storage path</p>
                <p className="mt-2 break-all text-sm leading-6 text-slate-400">
                  {document.file_path}
                </p>
              </div>

              {content?.extraction_status === "failed" && content.error_message ? (
                <div className="rounded-2xl border border-rose-400/25 bg-rose-400/10 p-5 text-sm leading-6 text-rose-100">
                  {content.error_message}
                </div>
              ) : null}
            </div>
          </Card>

          {content?.raw_text ? (
            <Card className="space-y-5">
              <div>
                <CardTitle>Extracted text</CardTitle>
                <CardDescription>
                  Full raw text stored for this document before future chunk retrieval or model use.
                </CardDescription>
              </div>
              <div className="max-h-[34rem] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                  {content.raw_text}
                </pre>
              </div>
            </Card>
          ) : (
            <EmptyState
              eyebrow="Raw text"
              title="No extracted text is stored yet."
              description="If extraction has not completed yet, refresh this page later. If extraction failed, the error message above should explain what happened."
              actionLabel="Back to documents"
              actionHref="/documents"
              secondaryActionLabel="Search library"
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
              <CardTitle>Stored chunks</CardTitle>
              <CardDescription>
                Retrieval-ready chunks stored in order for this document.
              </CardDescription>
            </div>

            <div className="grid gap-4">
              {chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
                        <span className="font-medium text-white">Chunk {chunk.chunk_index + 1}</span>
                        <span>{chunk.character_count} chars</span>
                        <span>{formatDocumentDate(chunk.created_at)}</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                        Preview
                      </p>
                      <p className="mt-3 text-sm leading-7 text-slate-300">
                        {getChunkPreview(chunk.content)}
                      </p>
                    </div>

                    <details className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <summary className="cursor-pointer text-sm font-medium text-white">
                        View full chunk content
                      </summary>
                      <div className="mt-4 border-t border-white/10 pt-4">
                        <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
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
            eyebrow="Chunks"
            title="No stored chunks yet for this document."
            description="Chunks appear after extraction and chunking complete. If extraction failed or is still pending, the chunk list will remain empty."
            actionLabel="Back to documents"
            actionHref="/documents"
            secondaryActionLabel="Search library"
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
