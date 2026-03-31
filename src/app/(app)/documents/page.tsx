import {
  deleteDocumentFromList,
  renameDocumentFromList,
  reprocessDocumentFromList,
} from "@/app/(app)/documents/actions";
import { DeleteDocumentForm } from "@/components/documents/delete-document-button";
import { DocumentStatusBadge, getDocumentStatusLabel } from "@/components/documents/document-status-badge";
import { ReprocessDocumentForm } from "@/components/documents/reprocess-document-button";
import { DocumentTitleForm } from "@/components/documents/document-title-form";
import { UploadDocumentForm } from "@/components/documents/upload-document-form";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { buildDocumentFileUrl, formatDocumentDate, formatFileSize } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

type DocumentsPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    status?: string;
    sort?: string;
  }>;
};

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const [{ error: pageError, message, status, sort }, supabase] = await Promise.all([
    searchParams,
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uploadBucket = process.env.SUPABASE_DOCUMENTS_BUCKET || "documents";

  const { data: documents, error } = await supabase
    .from("documents")
    .select(
      "id, title, file_name, file_path, file_size, mime_type, created_at, document_contents(extraction_status, page_count, chunk_count, error_message)",
    )
    .order("created_at", { ascending: false });

  const documentCount = documents?.length ?? 0;
  const normalizedDocuments = (documents ?? []).map((document) => ({
    ...document,
    content: Array.isArray(document.document_contents)
      ? document.document_contents[0]
      : document.document_contents,
  }));
  const activeStatus = status === "completed" || status === "failed" || status === "pending" ? status : "all";
  const activeSort =
    sort === "oldest" || sort === "title-asc" || sort === "title-desc" ? sort : "newest";
  const filteredDocuments = normalizedDocuments.filter((document) => {
    if (activeStatus === "all") {
      return true;
    }

    return (document.content?.extraction_status ?? "pending") === activeStatus;
  });
  const sortedDocuments = [...filteredDocuments].sort((left, right) => {
    if (activeSort === "oldest") {
      return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
    }

    if (activeSort === "title-asc") {
      return left.title.localeCompare(right.title);
    }

    if (activeSort === "title-desc") {
      return right.title.localeCompare(left.title);
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
  const completedCount = normalizedDocuments.filter(
    (document) => document.content?.extraction_status === "completed",
  ).length;
  const failedCount = normalizedDocuments.filter(
    (document) => document.content?.extraction_status === "failed",
  ).length;
  const pendingCount = normalizedDocuments.filter(
    (document) => (document.content?.extraction_status ?? "pending") === "pending",
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Documents"
        title="Organize your source material"
        description="Upload, organize, and revisit the study materials tied to your account."
        actions={
          <>
            <Button href="/dashboard" variant="secondary">
              Back to dashboard
            </Button>
            <Button href="/chat">Open chat</Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-5">
          <Card className="space-y-5">
            <div className="space-y-2">
              <CardTitle>Library overview</CardTitle>
              <CardDescription>
                Keep track of what is ready to study, what is still processing, and what needs attention.
              </CardDescription>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-400">Signed-in account</p>
                <p className="mt-2 break-all text-base font-medium text-white">{user?.email}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-slate-400">Documents in library</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{documentCount}</p>
                  <p className="mt-2 text-sm text-slate-400">Private to your account.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-slate-400">Ready</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{completedCount}</p>
                  <p className="mt-2 text-sm text-slate-400">Ready for search and study tools.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-slate-400">Attention</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {failedCount}/{pendingCount}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">Need review / still processing.</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="space-y-5">
            <div className="space-y-2">
              <CardTitle>Upload a PDF</CardTitle>
              <CardDescription>
                Add class notes, slides, or reading packets to your library. StudyStack will prepare them so you can search, review, and build study tools from them.
              </CardDescription>
            </div>

            {pageError ? <AlertBanner tone="error">{pageError}</AlertBanner> : null}

            {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}

            {user ? <UploadDocumentForm userId={user.id} bucket={uploadBucket} /> : null}
          </Card>
        </div>

        {error ? (
          <Card className="space-y-3">
            <CardTitle>Document query needs setup</CardTitle>
            <CardDescription>
              Supabase returned an error while loading documents: {error.message}
            </CardDescription>
            <CardDescription>
              Run both the database SQL and the Storage bucket SQL setup, then reload this page.
            </CardDescription>
          </Card>
        ) : documentCount === 0 ? (
          <EmptyState
            eyebrow="No documents yet"
            title="Your document library is ready for the first upload."
            description="Upload a PDF from the panel on the left to start searching, reviewing, and studying from your own materials."
            actionLabel="Upload a PDF"
            actionHref="/documents"
            secondaryActionLabel="Back to dashboard"
            secondaryActionHref="/dashboard"
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                <path d="M7 3.75h7l5 5V20.25A1.75 1.75 0 0 1 17.25 22h-10.5A1.75 1.75 0 0 1 5 20.25V5.5A1.75 1.75 0 0 1 6.75 3.75Z" />
                <path d="M14 3.75v5h5" />
              </svg>
            }
          />
        ) : (
          <Card className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>Documents</CardTitle>
                <CardDescription>
                  Your uploaded PDFs, with quick actions to rename, open, download, refresh, and manage them.
                </CardDescription>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                {sortedDocuments.length} shown
              </div>
            </div>

            <form className="grid gap-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Filter by status</span>
                <select
                  name="status"
                  defaultValue={activeStatus}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors focus:border-cyan-300/40"
                >
                  <option value="all">All statuses</option>
                  <option value="completed">Ready</option>
                  <option value="pending">Processing</option>
                  <option value="failed">Needs attention</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Sort</span>
                <select
                  name="sort"
                  defaultValue={activeSort}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors focus:border-cyan-300/40"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title-asc">Title A-Z</option>
                  <option value="title-desc">Title Z-A</option>
                </select>
              </label>
              <div className="flex flex-wrap gap-3">
                <Button type="submit">Apply</Button>
                <Button href="/documents" variant="secondary">
                  Reset
                </Button>
              </div>
            </form>

            {sortedDocuments.length === 0 ? (
              <EmptyState
                eyebrow="No matching documents"
                title="No documents match the current filters."
                description="Try a different filter or sort setting, or upload another PDF to expand your library."
                actionLabel="Reset filters"
                actionHref="/documents"
                secondaryActionLabel="Upload another PDF"
                secondaryActionHref="/documents"
                icon={
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                    <path d="M4 6.75A1.75 1.75 0 0 1 5.75 5h12.5A1.75 1.75 0 0 1 20 6.75v10.5A1.75 1.75 0 0 1 18.25 19H5.75A1.75 1.75 0 0 1 4 17.25Z" />
                    <path d="M8 9h8M8 13h5" />
                  </svg>
                }
              />
            ) : (
              <div className="grid gap-4">
                {sortedDocuments.map((document) => (
                <div
                  key={document.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <DocumentStatusBadge status={document.content?.extraction_status} />
                        <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          {getDocumentStatusLabel(document.content?.extraction_status)}
                        </span>
                      </div>
                      <DocumentTitleForm
                        action={renameDocumentFromList}
                        documentId={document.id}
                        initialTitle={document.title}
                        redirectTo="/documents"
                        compact
                      />
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
                        <span>{document.file_name}</span>
                        <span>{document.mime_type}</span>
                        <span>{formatFileSize(document.file_size)}</span>
                        <span>{formatDocumentDate(document.created_at)}</span>
                        <span>{document.content?.page_count ?? "?"} pages</span>
                        <span>{document.content?.chunk_count ?? 0} sections</span>
                      </div>
                      <p className="text-sm leading-7 text-slate-300">
                        {document.content?.extraction_status === "completed"
                          ? "This document is ready to preview, search, and inspect in detail."
                          : document.content?.extraction_status === "failed"
                            ? "This file could not be prepared. Review the error and try again when ready."
                            : "Extraction is still in progress. You can keep working elsewhere and check back later."}
                      </p>
                      {document.content?.extraction_status === "failed" &&
                      document.content.error_message ? (
                        <AlertBanner tone="error" className="text-xs">
                          {document.content.error_message}
                        </AlertBanner>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-3 xl:items-end">
                      <div className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300 xl:max-w-sm">
                        <p className="font-medium text-slate-100">Saved file path</p>
                        <p className="mt-1 break-all text-slate-400">{document.file_path}</p>
                      </div>
                      <div className="flex w-full flex-col gap-3 sm:flex-row xl:max-w-sm xl:flex-col">
                        <Button href={`/documents/${document.id}`} variant="secondary" className="justify-center">
                          View details
                        </Button>
                        <Button
                          href={buildDocumentFileUrl(document.id, "view")}
                          variant="ghost"
                          external
                          target="_blank"
                          rel="noreferrer"
                          className="justify-center border border-white/10 bg-white/[0.06] text-white hover:border-cyan-300/40 hover:bg-white/10"
                        >
                          View PDF
                        </Button>
                        <Button
                          href={buildDocumentFileUrl(document.id, "download")}
                          variant="ghost"
                          external
                          className="justify-center border border-white/10 bg-white/[0.06] text-white hover:border-cyan-300/40 hover:bg-white/10"
                        >
                          Download PDF
                        </Button>
                        <ReprocessDocumentForm
                          action={reprocessDocumentFromList}
                          documentId={document.id}
                          label="Reprocess document"
                          pendingLabel="Reprocessing..."
                          className="justify-center border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20"
                        />
                        <DeleteDocumentForm
                          action={deleteDocumentFromList}
                          documentId={document.id}
                          confirmMessage={`Delete "${document.title}" and all extracted data? This cannot be undone.`}
                          label="Delete document"
                          pendingLabel="Deleting..."
                          className="justify-center border border-rose-400/20 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
