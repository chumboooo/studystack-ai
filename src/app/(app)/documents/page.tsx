import {
  deleteDocumentFromList,
  reprocessDocumentFromList,
  uploadDocument,
} from "@/app/(app)/documents/actions";
import { DeleteDocumentForm } from "@/components/documents/delete-document-button";
import { ReprocessDocumentForm } from "@/components/documents/reprocess-document-button";
import { PageHeader } from "@/components/app/page-header";
import { UploadSubmitButton } from "@/components/documents/upload-submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { buildDocumentFileUrl, formatDocumentDate, formatFileSize } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

type DocumentsPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const [{ error: pageError, message }, supabase] = await Promise.all([searchParams, createClient()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Documents"
        title="Organize your source material"
        description="Your document library is backed by Supabase Storage and metadata is scoped to the signed-in account."
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
                The first document layer stores PDFs in Supabase Storage and keeps each user&apos;s
                metadata isolated with row-level security.
              </CardDescription>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-400">Signed-in account</p>
                <p className="mt-2 break-all text-base font-medium text-white">{user?.email}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-400">Documents in library</p>
                <p className="mt-2 text-3xl font-semibold text-white">{documentCount}</p>
                <p className="mt-2 text-sm text-slate-400">Stored per user in Supabase.</p>
              </div>
            </div>
          </Card>

          <Card className="space-y-5">
            <div className="space-y-2">
              <CardTitle>Upload a PDF</CardTitle>
              <CardDescription>
                Uploads are restricted to the current signed-in user. A matching row is created in
                the `documents` table after the file lands in Storage, then PDF text is extracted
                into a separate content layer for future chunking and search.
              </CardDescription>
            </div>

            {pageError ? (
              <div className="rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {pageError}
              </div>
            ) : null}

            {message ? (
              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                {message}
              </div>
            ) : null}

            <form action={uploadDocument} className="space-y-5">
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
                  className="block w-full rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-4 text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-300 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-950 hover:file:bg-cyan-200"
                />
                <p className="text-xs text-slate-500">
                  PDF only. The default bucket setup below uses a 10 MB limit.
                </p>
              </label>

              <div className="flex justify-end">
                <UploadSubmitButton />
              </div>
            </form>
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
            description="Upload a PDF from the panel on the left and it will be stored in Supabase Storage with a matching metadata row for this user."
            actionLabel="Back to dashboard"
            actionHref="/dashboard"
            secondaryActionLabel="Open chat"
            secondaryActionHref="/chat"
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
                  PDFs uploaded to Supabase Storage for the current authenticated user.
                </CardDescription>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                {documentCount} total
              </div>
            </div>

            <div className="grid gap-4">
              {normalizedDocuments.map((document) => (
                <div
                  key={document.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-white">{document.title}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
                        <span>{document.file_name}</span>
                        <span>{document.mime_type}</span>
                        <span>{formatFileSize(document.file_size)}</span>
                        <span>{formatDocumentDate(document.created_at)}</span>
                        {document.content?.page_count ? (
                          <span>{document.content.page_count} pages</span>
                        ) : null}
                        {typeof document.content?.chunk_count === "number" &&
                        document.content.chunk_count > 0 ? (
                          <span>{document.content.chunk_count} chunks</span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span
                          className={
                            document.content?.extraction_status === "completed"
                              ? "rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200"
                              : document.content?.extraction_status === "failed"
                                ? "rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-xs text-rose-200"
                                : "rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-200"
                          }
                        >
                          {document.content?.extraction_status === "completed"
                            ? "Text extracted"
                            : document.content?.extraction_status === "failed"
                              ? "Extraction failed"
                              : "Extraction pending"}
                        </span>
                        {document.content?.extraction_status === "failed" &&
                        document.content.error_message ? (
                          <span className="text-xs text-slate-500">
                            {document.content.error_message}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm leading-7 text-slate-300">
                        Open the detail view to inspect extracted text and stored chunks for this
                        document.
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col gap-3 lg:items-end">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                        <p className="font-medium text-slate-100">Storage path</p>
                        <p className="mt-1 max-w-xs break-all text-slate-400">
                          {document.file_path}
                        </p>
                      </div>
                      <Button href={`/documents/${document.id}`} variant="secondary">
                        View details
                      </Button>
                      <div className="flex flex-col gap-3 sm:flex-row">
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
                      </div>
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
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
