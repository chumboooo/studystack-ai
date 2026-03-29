import { formatDocumentDate, formatFileSize } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: documents, error } = await supabase
    .from("documents")
    .select("id, title, file_name, file_path, file_size, mime_type, created_at")
    .order("created_at", { ascending: false });

  const documentCount = documents?.length ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Documents"
        title="Organize your source material"
        description="Your document library is now backed by Supabase and scoped to the signed-in account. Upload handling can layer in next."
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
        <Card className="space-y-5">
          <div className="space-y-2">
            <CardTitle>Library overview</CardTitle>
            <CardDescription>
              The first document layer stores metadata in Supabase and keeps each user’s library
              isolated with row-level security.
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
              <p className="mt-2 text-sm text-slate-400">Ordered by most recently created.</p>
            </div>
          </div>
        </Card>

        {error ? (
          <Card className="space-y-3">
            <CardTitle>Document query needs setup</CardTitle>
            <CardDescription>
              Supabase returned an error while loading documents: {error.message}
            </CardDescription>
            <CardDescription>
              Run the `public.documents` SQL setup first, then reload this page.
            </CardDescription>
          </Card>
        ) : documentCount === 0 ? (
          <EmptyState
            eyebrow="No documents yet"
            title="Your document library is ready for the first upload."
            description="Document metadata is now wired to Supabase. Once uploads are added, new files will appear here for the signed-in user."
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
                  Metadata stored in Supabase for the current authenticated user.
                </CardDescription>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                {documentCount} total
              </div>
            </div>

            <div className="grid gap-4">
              {documents.map((document) => (
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
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                      <p className="font-medium text-slate-100">Storage path</p>
                      <p className="mt-1 break-all text-slate-400">{document.file_path}</p>
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
