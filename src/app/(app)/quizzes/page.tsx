import {
  createManualQuizSet,
  deleteQuizSet,
  generateQuizSet,
} from "@/app/(app)/quizzes/actions";
import { ManualQuizForm } from "@/components/quizzes/manual-quiz-form";
import { ActionSubmitButton, ConfirmActionSubmitButton } from "@/components/study-tools/action-submit-button";
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

function getSetModeLabel(sourceMode: string) {
  return sourceMode === "manual" ? "Manual" : "From notes";
}

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
      .select("id, title, source_mode, created_at, updated_at, quiz_questions(id)")
      .order("updated_at", { ascending: false }),
  ]);

  const normalizedDocuments = (documents ?? []).map((document) => ({
    ...document,
    content: Array.isArray(document.document_contents)
      ? document.document_contents[0]
      : document.document_contents,
  }));

  return (
    <div className="space-y-6">
      <section className="surface-enter rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.22)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Quizzes
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Practice with source-backed quizzes.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Build multiple-choice practice from your study materials and reopen saved quiz sessions anytime.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/flashcards" variant="secondary">
              Open flashcards
            </Button>
            <Button href="/documents">Browse documents</Button>
          </div>
        </div>
      </section>

      {pageError ? <AlertBanner tone="error">{pageError}</AlertBanner> : null}
      {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}

      <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-5">
        <Card className="surface-enter space-y-5">
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

        <Card className="surface-enter space-y-5">
          <div>
            <CardTitle>Create your own quiz</CardTitle>
            <CardDescription>
              Write custom multiple-choice questions and save them as a reusable practice quiz.
            </CardDescription>
          </div>
          <ManualQuizForm action={createManualQuizSet} />
        </Card>
        </div>

        <Card className="surface-enter space-y-5">
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
              title="Create your first quiz."
              description="Generate a quiz from your study materials or write your own questions and retake them later."
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
            <div className="max-h-[31rem] overflow-y-auto pr-1 smooth-scroll">
              <div className="grid gap-3">
              {sets.map((quizSet) => (
                <div
                  key={quizSet.id}
                  className="soft-hover flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-white">{quizSet.title}</p>
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-cyan-200">
                        {getSetModeLabel(quizSet.source_mode)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
                      <span>{Array.isArray(quizSet.quiz_questions) ? quizSet.quiz_questions.length : 0} questions</span>
                      <span>
                      Updated {formatDocumentDate(quizSet.updated_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button href={`/quizzes/${quizSet.id}`}>Start</Button>
                    <form action={deleteQuizSet}>
                      <input type="hidden" name="setId" value={quizSet.id} />
                      <ConfirmActionSubmitButton
                        label="Delete"
                        pendingLabel="Deleting..."
                        confirmMessage={`Delete "${quizSet.title}"? This cannot be undone.`}
                        variant="ghost"
                        className="border border-rose-400/20 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20"
                      />
                    </form>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
