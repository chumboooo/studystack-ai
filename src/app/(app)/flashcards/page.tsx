import {
  deleteFlashcardSet,
  generateFlashcardSet,
  regenerateFlashcardSet,
} from "@/app/(app)/flashcards/actions";
import { FlashcardView } from "@/components/flashcards/flashcard-view";
import { PageHeader } from "@/components/app/page-header";
import { ActionSubmitButton } from "@/components/study-tools/action-submit-button";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDocumentDate } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

type FlashcardsPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    set?: string;
    view?: string;
  }>;
};

export default async function FlashcardsPage({ searchParams }: FlashcardsPageProps) {
  const [{ error: pageError, message, set, view }, supabase] = await Promise.all([
    searchParams,
    createClient(),
  ]);
  const activeView = view === "list" ? "list" : "grid";

  const [{ data: documents }, { data: sets }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, title, document_contents(chunk_count, extraction_status)")
      .order("created_at", { ascending: false }),
    supabase
      .from("flashcard_sets")
      .select("id, title, created_at, updated_at")
      .order("updated_at", { ascending: false }),
  ]);

  const normalizedDocuments = (documents ?? []).map((document) => ({
    ...document,
    content: Array.isArray(document.document_contents)
      ? document.document_contents[0]
      : document.document_contents,
  }));

  const activeSetId = set?.trim() || sets?.[0]?.id || null;
  const { data: activeSet } = activeSetId
    ? await supabase
        .from("flashcard_sets")
        .select("id, title, created_at, updated_at")
        .eq("id", activeSetId)
        .maybeSingle()
    : { data: null };

  const { data: cards } = activeSet
    ? await supabase
        .from("flashcards")
        .select(
          "id, prompt, answer, source_document_id, source_document_title, source_chunk_index, created_at",
        )
        .eq("set_id", activeSet.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Flashcards"
        title="Create flashcards"
        description="Turn your study materials into review cards you can revisit anytime."
        actions={
          <>
            <Button href="/quizzes" variant="secondary">
              View quizzes
            </Button>
            <Button href="/documents">Browse documents</Button>
          </>
        }
      />

      {pageError ? <AlertBanner tone="error">{pageError}</AlertBanner> : null}
      {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}

      <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-5">
          <Card className="space-y-5">
            <div>
              <CardTitle>Create flashcards</CardTitle>
              <CardDescription>
                Create cards from one document or from the materials in your library.
              </CardDescription>
            </div>

            <form action={generateFlashcardSet} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">Set title</span>
                <input
                  name="title"
                  type="text"
                  placeholder="Biology Chapter 3 recall"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">Topic</span>
                <input
                  name="topic"
                  type="text"
                  placeholder="Krebs cycle outputs"
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
                <span className="text-sm font-medium text-slate-200">Flashcard count</span>
                <input
                  name="count"
                  type="number"
                  min={1}
                  max={24}
                  defaultValue={8}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
                />
                <p className="text-xs text-slate-500">
                  Choose how many cards to aim for. StudyStack will stop early only if it cannot create more distinct, high-quality cards from the selected material.
                </p>
              </label>

              <div className="flex justify-end">
                <ActionSubmitButton label="Generate flashcards" pendingLabel="Generating..." />
              </div>
            </form>
          </Card>

          <Card className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Saved sets</CardTitle>
                <CardDescription>Review and reopen previously generated flashcard sets.</CardDescription>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                {sets?.length ?? 0} total
              </div>
            </div>

            {!sets || sets.length === 0 ? (
              <EmptyState
                eyebrow="No flashcards yet"
                title="Generate your first flashcard set."
                description="Create cards from your own study materials and save them for later review."
                actionLabel="Browse documents"
                actionHref="/documents"
                secondaryActionLabel="Open quizzes"
                secondaryActionHref="/quizzes"
                icon={
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                    <path d="M8 6.75h10.25A1.75 1.75 0 0 1 20 8.5v8.75A1.75 1.75 0 0 1 18.25 19H8" />
                    <path d="M15 5H5.75A1.75 1.75 0 0 0 4 6.75v8.5A1.75 1.75 0 0 0 5.75 17H15a1.75 1.75 0 0 0 1.75-1.75v-8.5A1.75 1.75 0 0 0 15 5Z" />
                  </svg>
                }
              />
            ) : (
              <div className="grid gap-3">
                {sets.map((flashcardSet) => (
                  <a
                    key={flashcardSet.id}
                    href={`/flashcards?set=${flashcardSet.id}&view=${activeView}`}
                    className={`rounded-2xl border p-4 transition-colors ${
                      activeSet?.id === flashcardSet.id
                        ? "border-cyan-300/30 bg-cyan-300/10"
                        : "border-white/10 bg-white/5 hover:border-cyan-300/20 hover:bg-white/[0.08]"
                    }`}
                  >
                    <p className="text-sm font-semibold text-white">{flashcardSet.title}</p>
                    <p className="mt-2 text-sm text-slate-400">
                      Updated {formatDocumentDate(flashcardSet.updated_at)}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </Card>
        </div>

        {!activeSet || !cards || cards.length === 0 ? (
          <EmptyState
            eyebrow="Flashcard review"
            title="Choose a saved set or generate a new one."
            description="Once cards are generated, you can flip them, review the answer, and jump back to the source section they came from."
            actionLabel="Browse documents"
            actionHref="/documents"
            secondaryActionLabel="Open quizzes"
            secondaryActionHref="/quizzes"
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                <path d="M8 6.75h10.25A1.75 1.75 0 0 1 20 8.5v8.75A1.75 1.75 0 0 1 18.25 19H8" />
                <path d="M15 5H5.75A1.75 1.75 0 0 0 4 6.75v8.5A1.75 1.75 0 0 0 5.75 17H15a1.75 1.75 0 0 0 1.75-1.75v-8.5A1.75 1.75 0 0 0 15 5Z" />
              </svg>
            }
          />
        ) : (
          <div className="space-y-5">
            <Card className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle>{activeSet.title}</CardTitle>
                  <CardDescription>
                    {cards.length} saved flashcards. Generated sets stay available so you can come back and review them later.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button href={`/flashcards?set=${activeSet.id}&view=grid`} variant={activeView === "grid" ? "primary" : "secondary"}>
                    Grid view
                  </Button>
                  <Button href={`/flashcards?set=${activeSet.id}&view=list`} variant={activeView === "list" ? "primary" : "secondary"}>
                    List view
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <form action={regenerateFlashcardSet}>
                  <input type="hidden" name="setId" value={activeSet.id} />
                  <ActionSubmitButton label="Regenerate set" pendingLabel="Regenerating..." />
                </form>
                <form action={deleteFlashcardSet}>
                  <input type="hidden" name="setId" value={activeSet.id} />
                  <ActionSubmitButton
                    label="Delete set"
                    pendingLabel="Deleting..."
                    variant="ghost"
                    className="border border-rose-400/20 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20"
                  />
                </form>
              </div>
            </Card>

            <FlashcardView cards={cards} view={activeView} />
          </div>
        )}
      </div>
    </div>
  );
}
