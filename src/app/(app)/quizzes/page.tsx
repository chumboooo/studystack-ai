import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function QuizzesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        badge="Quizzes"
        title="Practice with generated assessments"
        description="Use this section for future quiz creation, attempt history, confidence scores, and answer review."
        actions={<Button href="/flashcards">Open flashcards</Button>}
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-5">
          <div>
            <CardTitle>Quiz formats</CardTitle>
            <CardDescription>Flexible assessment styles for different levels of mastery.</CardDescription>
          </div>
          <div className="grid gap-4">
            {[
              { title: "Quick check", detail: "5 questions for rapid recall" },
              { title: "Timed review", detail: "Exam-style pacing and scoring" },
              { title: "Target weak areas", detail: "Focus on concepts you missed before" },
            ].map((quiz) => (
              <div key={quiz.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-base font-medium text-white">{quiz.title}</p>
                <p className="mt-2 text-sm text-slate-400">{quiz.detail}</p>
              </div>
            ))}
          </div>
        </Card>

        <EmptyState
          eyebrow="No quiz generated"
          title="Turn your notes into a quiz when content is ready."
          description="This space can later hold generated quizzes, review analytics, and recommended next steps based on performance."
          actionLabel="Review documents"
          actionHref="/documents"
          secondaryActionLabel="See dashboard"
          secondaryActionHref="/dashboard"
          icon={
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
              <path d="M12 18h.01M9.09 9a3 3 0 1 1 5.82 1c-.4 1.39-1.91 1.84-2.41 2.96-.17.39-.25.72-.25 1.54" />
              <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
            </svg>
          }
        />
      </div>
    </div>
  );
}
