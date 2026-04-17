"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildDocumentChunkUrl } from "@/lib/documents";

type Flashcard = {
  id: string;
  prompt: string;
  answer: string;
  source_document_id: string | null;
  source_document_title: string;
  source_chunk_index: number;
};

function shuffleCards(cards: Flashcard[]) {
  return cards
    .map((card) => ({ card, sort: Math.random() }))
    .sort((left, right) => left.sort - right.sort)
    .map(({ card }) => card);
}

export function FlashcardStudySession({ cards }: { cards: Flashcard[] }) {
  const [cardOrder, setCardOrder] = useState(cards);
  const [activeIndex, setActiveIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const activeCard = cardOrder[activeIndex];
  const progress = useMemo(
    () => Math.round(((activeIndex + 1) / Math.max(cardOrder.length, 1)) * 100),
    [activeIndex, cardOrder.length],
  );

  function goToCard(nextIndex: number) {
    setActiveIndex(Math.min(Math.max(nextIndex, 0), cardOrder.length - 1));
    setFlipped(false);
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-13rem)] w-full max-w-5xl flex-col justify-center gap-6">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-slate-950/45 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-sm font-medium text-white">
            Card {activeIndex + 1} of {cardOrder.length}
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10 sm:w-80">
            <div
              className="h-full rounded-full bg-cyan-300 transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setCardOrder(shuffleCards(cards));
              setActiveIndex(0);
              setFlipped(false);
            }}
          >
            Shuffle
          </Button>
          <Button type="button" variant="secondary" onClick={() => goToCard(0)}>
            Restart
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((current) => !current)}
        className="group min-h-[22rem] rounded-[2.25rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] p-8 text-left shadow-[0_24px_70px_rgba(2,6,23,0.38)] outline-none transition-colors hover:border-cyan-300/35 focus-visible:ring-2 focus-visible:ring-cyan-300/70 sm:min-h-[28rem] sm:p-12"
        aria-label={flipped ? "Show front of flashcard" : "Reveal flashcard answer"}
      >
        <div className="flex h-full min-h-[18rem] flex-col justify-between gap-8 sm:min-h-[22rem]">
          <div className="flex items-center justify-between gap-4">
            <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
              {flipped ? "Back" : "Front"}
            </span>
            <span className="text-sm text-slate-400">Click to flip</span>
          </div>

          <div className="mx-auto max-w-3xl text-center">
            <p className="text-2xl font-semibold leading-tight text-white sm:text-4xl">
              {flipped ? activeCard.answer : activeCard.prompt}
            </p>
          </div>

          <div className="flex justify-center">
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-300">
              {flipped ? "Review the answer, then move on." : "Think of the answer before flipping."}
            </span>
          </div>
        </div>
      </button>

      <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{activeCard.source_document_title}</p>
          <p className="mt-1 text-sm text-slate-400">Source section {activeCard.source_chunk_index + 1}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {activeCard.source_document_id ? (
            <Button
              href={buildDocumentChunkUrl(activeCard.source_document_id, activeCard.source_chunk_index)}
              variant="secondary"
            >
              Open source
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            disabled={activeIndex === 0}
            onClick={() => goToCard(activeIndex - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            disabled={activeIndex === cardOrder.length - 1}
            onClick={() => goToCard(activeIndex + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}
