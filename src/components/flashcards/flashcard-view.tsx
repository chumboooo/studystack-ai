"use client";

import { useState } from "react";
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

export function FlashcardView({
  cards,
  view,
}: {
  cards: Flashcard[];
  view: "grid" | "list";
}) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  return (
    <div className={view === "grid" ? "grid gap-4 xl:grid-cols-2" : "grid gap-4"}>
      {cards.map((card, index) => {
        const isRevealed = Boolean(revealed[card.id]);

        return (
          <div
            key={card.id}
            className="rounded-3xl border border-white/10 bg-white/5 p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-200">
                Card {index + 1}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                Section {card.source_chunk_index + 1}
              </span>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Front
                </p>
                <p className="mt-3 text-base leading-7 text-white">{card.prompt}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Back
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 px-4 text-xs"
                    onClick={() =>
                      setRevealed((current) => ({
                        ...current,
                        [card.id]: !current[card.id],
                      }))
                    }
                  >
                    {isRevealed ? "Hide" : "Reveal"}
                  </Button>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {isRevealed ? card.answer : "Reveal the back to review the answer."}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div>
                  <p className="text-sm font-medium text-white">{card.source_document_title}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    From section {card.source_chunk_index + 1}
                  </p>
                </div>
                {card.source_document_id ? (
                  <Button
                    href={buildDocumentChunkUrl(card.source_document_id, card.source_chunk_index)}
                    variant="secondary"
                  >
                    Open source
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
