import { notFound } from "next/navigation";
import {
  deleteFlashcardSet,
  regenerateFlashcardSet,
} from "@/app/(app)/flashcards/actions";
import { PageHeader } from "@/components/app/page-header";
import { FlashcardStudySession } from "@/components/flashcards/flashcard-study-session";
import { ActionSubmitButton } from "@/components/study-tools/action-submit-button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDocumentDate } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

type FlashcardStudyPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function FlashcardStudyPage({
  params,
  searchParams,
}: FlashcardStudyPageProps) {
  const [{ id }, { error, message }, supabase] = await Promise.all([
    params,
    searchParams,
    createClient(),
  ]);

  const { data: set } = await supabase
    .from("flashcard_sets")
    .select("id, title, source_mode, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (!set) {
    notFound();
  }

  const { data: cards } = await supabase
    .from("flashcards")
    .select(
      "id, prompt, answer, source_document_id, source_document_title, source_chunk_index, created_at",
    )
    .eq("set_id", set.id)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Flashcards"
        title={set.title}
        description={`${cards?.length ?? 0} saved cards. Last updated ${formatDocumentDate(set.updated_at)}.`}
        actions={
          <>
            <Button href="/flashcards" variant="secondary">
              Back to flashcards
            </Button>
            <Button href="/quizzes" variant="secondary">
              Open quizzes
            </Button>
          </>
        }
      />

      {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}
      {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}

      {!cards || cards.length === 0 ? (
        <EmptyState
          eyebrow="No cards in this set"
          title="This flashcard set is empty."
          description="Regenerate the set or create a new one from your study materials."
          actionLabel="Create flashcards"
          actionHref="/flashcards"
          secondaryActionLabel="Browse documents"
          secondaryActionHref="/documents"
          icon={
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
              <path d="M8 6.75h10.25A1.75 1.75 0 0 1 20 8.5v8.75A1.75 1.75 0 0 1 18.25 19H8" />
              <path d="M15 5H5.75A1.75 1.75 0 0 0 4 6.75v8.5A1.75 1.75 0 0 0 5.75 17H15a1.75 1.75 0 0 0 1.75-1.75v-8.5A1.75 1.75 0 0 0 15 5Z" />
            </svg>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap justify-end gap-3">
            {set.source_mode === "manual" ? null : (
              <form action={regenerateFlashcardSet}>
                <input type="hidden" name="setId" value={set.id} />
                <ActionSubmitButton label="Regenerate set" pendingLabel="Regenerating..." />
              </form>
            )}
            <form action={deleteFlashcardSet}>
              <input type="hidden" name="setId" value={set.id} />
              <ActionSubmitButton
                label="Delete set"
                pendingLabel="Deleting..."
                variant="ghost"
                className="border border-rose-400/20 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20"
              />
            </form>
          </div>
          <FlashcardStudySession cards={cards} />
        </>
      )}
    </div>
  );
}
