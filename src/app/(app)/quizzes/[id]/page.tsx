import { notFound } from "next/navigation";
import { deleteQuizSet, regenerateQuizSet } from "@/app/(app)/quizzes/actions";
import { PageHeader } from "@/components/app/page-header";
import { QuizStudySession } from "@/components/quizzes/quiz-study-session";
import { ActionSubmitButton } from "@/components/study-tools/action-submit-button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDocumentDate } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

type QuizStudyPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function QuizStudyPage({ params, searchParams }: QuizStudyPageProps) {
  const [{ id }, { error, message }, supabase] = await Promise.all([
    params,
    searchParams,
    createClient(),
  ]);

  const { data: set } = await supabase
    .from("quiz_sets")
    .select("id, title, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (!set) {
    notFound();
  }

  const { data: questions } = await supabase
    .from("quiz_questions")
    .select(
      "id, question, choices, correct_choice_index, explanation, source_document_id, source_document_title, source_chunk_index, created_at",
    )
    .eq("set_id", set.id)
    .order("created_at", { ascending: true });

  const normalizedQuestions = (questions ?? []).map((question) => ({
    ...question,
    choices: Array.isArray(question.choices) ? question.choices.map(String) : [],
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Quiz"
        title={set.title}
        description={`${normalizedQuestions.length} saved question${normalizedQuestions.length === 1 ? "" : "s"}. Last updated ${formatDocumentDate(set.updated_at)}.`}
        actions={
          <>
            <Button href="/quizzes" variant="secondary">
              Back to quizzes
            </Button>
            <Button href="/flashcards" variant="secondary">
              Open flashcards
            </Button>
          </>
        }
      />

      {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}
      {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}

      {normalizedQuestions.length === 0 ? (
        <EmptyState
          eyebrow="No questions in this quiz"
          title="This quiz is empty."
          description="Regenerate the quiz or create a new one from your study materials."
          actionLabel="Create quiz"
          actionHref="/quizzes"
          secondaryActionLabel="Browse documents"
          secondaryActionHref="/documents"
          icon={
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
              <path d="M12 18h.01M9.09 9a3 3 0 1 1 5.82 1c-.4 1.39-1.91 1.84-2.41 2.96-.17.39-.25.72-.25 1.54" />
              <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
            </svg>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap justify-end gap-3">
            <form action={regenerateQuizSet}>
              <input type="hidden" name="setId" value={set.id} />
              <ActionSubmitButton label="Regenerate quiz" pendingLabel="Regenerating..." />
            </form>
            <form action={deleteQuizSet}>
              <input type="hidden" name="setId" value={set.id} />
              <ActionSubmitButton
                label="Delete quiz"
                pendingLabel="Deleting..."
                variant="ghost"
                className="border border-rose-400/20 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20"
              />
            </form>
          </div>
          <QuizStudySession questions={normalizedQuestions} />
        </>
      )}
    </div>
  );
}
