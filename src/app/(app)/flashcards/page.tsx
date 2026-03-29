import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function FlashcardsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        badge="Flashcards"
        title="Build active recall into the workflow"
        description="This route is ready for generated decks, spaced repetition queues, and study session controls."
        actions={
          <Button href="/quizzes" variant="secondary">
            View quizzes
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card className="space-y-5">
          <div>
            <CardTitle>Deck templates</CardTitle>
            <CardDescription>Reusable deck types for different study modes.</CardDescription>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Definition recall",
              "Concept comparison",
              "Diagram labeling",
              "Language vocabulary",
            ].map((deck) => (
              <div key={deck} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-medium text-white">{deck}</p>
                <p className="mt-2 text-sm text-slate-400">UI placeholder for a generated deck.</p>
              </div>
            ))}
          </div>
        </Card>

        <EmptyState
          eyebrow="No flashcard deck"
          title="Generate your first flashcard set from study material."
          description="When backend generation is added, this view can hold deck previews, study stats, and review scheduling."
          actionLabel="Browse documents"
          actionHref="/documents"
          secondaryActionLabel="Open chat"
          secondaryActionHref="/chat"
          icon={
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
              <path d="M8 6.75h10.25A1.75 1.75 0 0 1 20 8.5v8.75A1.75 1.75 0 0 1 18.25 19H8" />
              <path d="M15 5H5.75A1.75 1.75 0 0 0 4 6.75v8.5A1.75 1.75 0 0 0 5.75 17H15a1.75 1.75 0 0 0 1.75-1.75v-8.5A1.75 1.75 0 0 0 15 5Z" />
            </svg>
          }
        />
      </div>
    </div>
  );
}
