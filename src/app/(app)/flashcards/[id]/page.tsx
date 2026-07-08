import { notFound } from "next/navigation";
import {
  deleteFlashcardSet,
  regenerateFlashcardSet,
  updateManualFlashcardSet,
} from "@/app/(app)/flashcards/actions";
import { PageHeader } from "@/components/app/page-header";
import { FlashcardStudySession } from "@/components/flashcards/flashcard-study-session";
import { ManualFlashcardForm } from "@/components/flashcards/manual-flashcard-form";
import { ActionSubmitButton } from "@/components/study-tools/action-submit-button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getDemoFlashcardSet } from "@/lib/demo/data";
import { isDemoSession } from "@/lib/demo/mode";
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
  const [{ id }, { error, message }] = await Promise.all([
    params,
    searchParams,
  ]);
  const demoMode = await isDemoSession();

  const demoSet = demoMode ? getDemoFlashcardSet(id) : null;
  const set = demoSet
    ? demoSet
    : (
        await (async () => {
          const supabase = await createClient();
          return supabase
            .from("flashcard_sets")
            .select("id, title, source_mode, created_at, updated_at")
            .eq("id", id)
            .maybeSingle();
        })()
      ).data;

  if (!set) {
    notFound();
  }

  const cards = demoMode
    ? demoSet?.cards ?? null
    : (
        await (async () => {
          const supabase = await createClient();
          return supabase
            .from("flashcards")
            .select(
              "id, prompt, answer, source_document_id, source_document_title, source_chunk_index, created_at",
            )
            .eq("set_id", set.id)
            .order("created_at", { ascending: true });
        })()
      ).data;

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
      {demoMode ? (
        <AlertBanner tone="info">
          Demo mode keeps this flashcard study session fully interactive while editing and destructive actions remain off.
        </AlertBanner>
      ) : null}

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
            {!demoMode && set.source_mode !== "manual" ? (
              <form action={regenerateFlashcardSet}>
                <input type="hidden" name="setId" value={set.id} />
                <ActionSubmitButton label="Regenerate set" pendingLabel="Regenerating..." />
              </form>
            ) : null}
            {!demoMode ? (
              <form action={deleteFlashcardSet}>
                <input type="hidden" name="setId" value={set.id} />
                <ActionSubmitButton
                  label="Delete set"
                  pendingLabel="Deleting..."
                  variant="ghost"
                  className="border border-rose-400/20 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20"
                />
              </form>
            ) : null}
          </div>
          {!demoMode && set.source_mode === "manual" ? (
            <Card className="space-y-5">
              <div>
                <CardTitle>Edit manual flashcards</CardTitle>
                <CardDescription>
                  Update prompts, answers, or set size without leaving the study page.
                </CardDescription>
              </div>
              <ManualFlashcardForm
                action={updateManualFlashcardSet}
                initialTitle={set.title}
                initialCards={(cards ?? []).map((card) => ({
                  prompt: card.prompt,
                  answer: card.answer,
                }))}
                submitLabel="Save changes"
                pendingLabel="Updating..."
                hiddenFields={[{ name: "setId", value: set.id }]}
              />
            </Card>
          ) : null}
          <FlashcardStudySession cards={cards} />
        </>
      )}
    </div>
  );
}
