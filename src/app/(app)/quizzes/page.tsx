import { generateQuizSet } from "@/app/(app)/quizzes/actions";
import { PageHeader } from "@/components/app/page-header";
import { ActionSubmitButton } from "@/components/study-tools/action-submit-button";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDocumentDate } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

type QuizzesPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function QuizzesPage({ searchParams }: QuizzesPageProps) {
  const [{ error: pageError, message }, supabase] = await Promise.all([
    searchParams,
    createClient(),
  ]);

  const [{ data: documents }, { data: sets }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, title, document_contents(chunk_count, extraction_status)")
      .order("created_at", { ascending: false }),
    supabase
      .from("quiz_sets")
      .select("id, title, created_at, updated_at")
      .order("updated_at", { ascending: false }),
  ]);

  const normalizedDocuments = (documents ?? []).map((document) => ({
    ...document,
    content: Array.isArray(document.document_contents)
      ? document.document_contents[0]
      : document.document_contents,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Quizzes"
        title="Create quizzes"
        description="Turn your study materials into multiple-choice practice you can review anytime."
        actions={
          <>
            <Button href="/flashcards" variant="secondary">
              Open flashcards
            </Button>
            <Button href="/documents">Browse documents</Button>
          </>
        }
      />

      {pageError ? <AlertBanner tone="error">{pageError}</AlertBanner> : null}
      {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="space-y-5">
          <div>
            <CardTitle>Create quiz</CardTitle>
            <CardDescription>
              Create a quiz from one document or from the materials in your library.
            </CardDescription>
          </div>

          <form action={generateQuizSet} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Quiz title</span>
              <input
                name="title"
                type="text"
                placeholder="Biology Chapter 3 quiz"
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Topic</span>
              <input
                name="topic"
                type="text"
                placeholder="Cellular respiration checkpoints"
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
              />
              <p className="text-xs text-slate-500">
                Optional if you pick a specific document below.
              </p>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Source document</span>
              <select
                name="documentId"
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors focus:border-cyan-300/40"
                defaultValue=""
              >
                <option value="">Use all documents</option>
                {normalizedDocuments
                  .filter((document) => (document.content?.chunk_count ?? 0) > 0)
                  .map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.title}
                    </option>
                  ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Question count</span>
              <input
                name="count"
                type="number"
                min={1}
                max={24}
                defaultValue={5}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
              />
              <p className="text-xs text-slate-500">
                Choose how many questions to aim for. StudyStack will stop early only if it cannot create more distinct, high-quality questions from the selected material.
              </p>
            </label>

            <div className="flex justify-end">
              <ActionSubmitButton label="Generate quiz" pendingLabel="Generating..." />
            </div>
          </form>
        </Card>

        <Card className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Saved quizzes</CardTitle>
              <CardDescription>
                Start a spacious quiz session with progress, scoring, explanations, and source links.
              </CardDescription>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              {sets?.length ?? 0} total
            </div>
          </div>

          {!sets || sets.length === 0 ? (
            <EmptyState
              eyebrow="No quizzes yet"
              title="Generate your first quiz."
              description="StudyStack will save your quiz questions, explanations, and sources so you can retake them later."
              actionLabel="Browse documents"
              actionHref="/documents"
              secondaryActionLabel="Open flashcards"
              secondaryActionHref="/flashcards"
              icon={
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                  <path d="M12 18h.01M9.09 9a3 3 0 1 1 5.82 1c-.4 1.39-1.91 1.84-2.41 2.96-.17.39-.25.72-.25 1.54" />
                  <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
                </svg>
              }
            />
          ) : (
            <div className="grid gap-3">
              {sets.map((quizSet) => (
                <div
                  key={quizSet.id}
                  className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-cyan-300/20 hover:bg-white/[0.08] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{quizSet.title}</p>
                    <p className="mt-2 text-sm text-slate-400">
                      Updated {formatDocumentDate(quizSet.updated_at)}
                    </p>
                  </div>
                  <Button href={`/quizzes/${quizSet.id}`}>Start quiz</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
