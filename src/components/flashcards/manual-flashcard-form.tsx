"use client";

import { useState } from "react";
import { ActionSubmitButton } from "@/components/study-tools/action-submit-button";
import { Button } from "@/components/ui/button";

type ManualFlashcardFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  initialTitle?: string;
  initialCards?: Array<{
    prompt: string;
    answer: string;
  }>;
  submitLabel?: string;
  pendingLabel?: string;
  hiddenFields?: Array<{
    name: string;
    value: string;
  }>;
};

type CardDraft = {
  id: number;
  prompt: string;
  answer: string;
};

export function ManualFlashcardForm({
  action,
  initialTitle = "",
  initialCards,
  submitLabel = "Save manual set",
  pendingLabel = "Saving...",
  hiddenFields = [],
}: ManualFlashcardFormProps) {
  const [cards, setCards] = useState<CardDraft[]>(
    initialCards && initialCards.length > 0
      ? initialCards.map((card, index) => ({
          id: index + 1,
          prompt: card.prompt,
          answer: card.answer,
        }))
      : [
          { id: 1, prompt: "", answer: "" },
          { id: 2, prompt: "", answer: "" },
        ],
  );
  const cardIds = cards.map((card) => card.id).join(",");

  return (
    <form action={action} className="space-y-4">
      {hiddenFields.map((field) => (
        <input key={field.name} type="hidden" name={field.name} value={field.value} />
      ))}
      <input type="hidden" name="cardIds" value={cardIds} />

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-200">Set title</span>
        <input
          name="title"
          type="text"
          required
          placeholder="Exam review cards"
          defaultValue={initialTitle}
          className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
        />
      </label>

      <div className="space-y-3">
        {cards.map((card, index) => (
          <div key={card.id} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Card {index + 1}</p>
              {cards.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  className="h-9 border border-white/10 px-3 text-xs"
                  onClick={() => setCards((current) => current.filter((item) => item.id !== card.id))}
                >
                  Remove
                </Button>
              ) : null}
            </div>

            <div className="grid gap-3">
              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Front
                </span>
                <textarea
                  name={`front-${card.id}`}
                  required
                  rows={2}
                  defaultValue={card.prompt}
                  placeholder="What should this card ask?"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Back
                </span>
                <textarea
                  name={`back-${card.id}`}
                  required
                  rows={3}
                  defaultValue={card.answer}
                  placeholder="Write the answer or explanation."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setCards((current) => [
              ...current,
              {
                id: Math.max(...current.map((card) => card.id)) + 1,
                prompt: "",
                answer: "",
              },
            ])
          }
        >
          Add card
        </Button>
        <ActionSubmitButton label={submitLabel} pendingLabel={pendingLabel} />
      </div>
    </form>
  );
}
