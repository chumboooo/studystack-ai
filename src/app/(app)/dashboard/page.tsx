import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDocumentDate } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: documents, error } = await supabase
    .from("documents")
    .select(
      "id, title, created_at, document_contents(extraction_status, chunk_count, error_message)",
    )
    .order("created_at", { ascending: false });

  const normalizedDocuments = (documents ?? []).map((document) => ({
    ...document,
    content: Array.isArray(document.document_contents)
      ? document.document_contents[0]
      : document.document_contents,
  }));

  const totalDocuments = normalizedDocuments.length;
  const completedDocuments = normalizedDocuments.filter(
    (document) => document.content?.extraction_status === "completed",
  ).length;
  const failedDocuments = normalizedDocuments.filter(
    (document) => document.content?.extraction_status === "failed",
  ).length;
  const totalChunks = normalizedDocuments.reduce(
    (sum, document) => sum + (document.content?.chunk_count ?? 0),
    0,
  );
  const recentDocuments = normalizedDocuments.slice(0, 5);

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Overview"
        title="Study dashboard"
        description="See what is ready to study, what still needs attention, and where to jump in next."
        actions={
          <>
            <Button href="/documents" variant="secondary">
              Browse library
            </Button>
            <Button href="/chat">Search documents</Button>
          </>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total documents"
          value={String(totalDocuments)}
          change={totalDocuments > 0 ? "Library active" : "Start here"}
          description="All PDFs uploaded to your private document library."
          tone="default"
        />
        <StatCard
          label="Ready for search"
          value={String(completedDocuments)}
          change={completedDocuments > 0 ? "Ready to use" : "Nothing ready yet"}
          description="Documents that are ready for chat, flashcards, and quizzes."
          tone="success"
        />
        <StatCard
          label="Needs attention"
          value={String(failedDocuments)}
          change={failedDocuments > 0 ? "Review errors" : "No failures"}
          description="Documents that failed extraction and may need reprocessing."
          tone={failedDocuments > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Saved sections"
          value={String(totalChunks)}
          change={totalChunks > 0 ? "Study-ready content" : "No sections yet"}
          description="Document sections available to support answers and study tools."
          tone="default"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Recent documents</CardTitle>
              <CardDescription>
                The latest files for {user?.email ?? "this account"}, with readiness at
                a glance.
              </CardDescription>
            </div>
            <Button href="/documents" variant="secondary">
              Open documents
            </Button>
          </div>

          {error ? (
            <AlertBanner tone="error">
              Dashboard stats could not load: {error.message}
            </AlertBanner>
          ) : recentDocuments.length === 0 ? (
              <EmptyState
                eyebrow="Library ready"
                title="Upload your first study document."
                description="Once a PDF is uploaded, this dashboard will show progress, recent activity, and quick links back into your study flow."
              actionLabel="Upload a PDF"
              actionHref="/documents"
              secondaryActionLabel="Open search"
              secondaryActionHref="/chat"
              icon={
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                  <path d="M7 3.75h7l5 5V20.25A1.75 1.75 0 0 1 17.25 22h-10.5A1.75 1.75 0 0 1 5 20.25V5.5A1.75 1.75 0 0 1 6.75 3.75Z" />
                  <path d="M14 3.75v5h5M12 11v6M9 14h6" />
                </svg>
              }
            />
          ) : (
            <div className="grid gap-4">
              {recentDocuments.map((document) => (
                <div
                  key={document.id}
                  className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-white">{document.title}</p>
                      <DocumentStatusBadge status={document.content?.extraction_status} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
                      <span>{formatDocumentDate(document.created_at)}</span>
                      <span>{document.content?.chunk_count ?? 0} sections</span>
                    </div>
                    {document.content?.extraction_status === "failed" &&
                    document.content.error_message ? (
                      <p className="text-sm leading-6 text-rose-200">
                        {document.content.error_message}
                      </p>
                    ) : (
                      <p className="text-sm leading-6 text-slate-300">
                        {document.content?.extraction_status === "completed"
                          ? "Ready to open, search, and inspect in detail."
                          : "Still preparing this file."}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-3">
                    <Button href={`/documents/${document.id}`} variant="secondary">
                      View
                    </Button>
                    <Button href="/chat" variant="ghost">
                      Search
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="space-y-5">
            <div>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>
                Common routes to keep your study flow moving.
              </CardDescription>
            </div>
            <div className="grid gap-4">
              {[
                {
                  title: "Upload a new PDF",
                  detail: "Add a source document to your library.",
                  href: "/documents",
                },
                {
                  title: "Ask study questions",
                  detail: "Search across the material in your library.",
                  href: "/chat",
                },
                {
                  title: "Browse document detail views",
                  detail: "Review document text, sections, and file details.",
                  href: "/documents",
                },
              ].map((item) => (
                <Button
                  key={item.title}
                  href={item.href}
                  variant="secondary"
                  className="h-auto justify-between rounded-2xl px-5 py-4 text-left"
                >
                  <span>
                    <span className="block text-sm font-semibold text-white">{item.title}</span>
                    <span className="mt-1 block text-sm text-slate-400">{item.detail}</span>
                  </span>
                </Button>
              ))}
            </div>
          </Card>

          <Card className="space-y-5">
            <div>
              <CardTitle>Pipeline health</CardTitle>
              <CardDescription>
                A quick view of what is ready and what still needs attention.
              </CardDescription>
            </div>
            <div className="grid gap-3">
              {[
                {
                  label: "Uploaded documents",
                  value: totalDocuments,
                },
                {
                  label: "Ready documents",
                  value: completedDocuments,
                },
                {
                  label: "Needs attention",
                  value: failedDocuments,
                },
                {
                  label: "Saved sections",
                  value: totalChunks,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3"
                >
                  <span className="text-sm text-slate-300">{item.label}</span>
                  <span className="text-base font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
