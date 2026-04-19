"use client";

import { useState } from "react";
import { ActionSubmitButton } from "@/components/study-tools/action-submit-button";
import { Button } from "@/components/ui/button";

type ManualQuizFormProps = {
  action: (formData: FormData) => void | Promise<void>;
};

type QuestionDraft = {
  id: number;
};

const choiceLabels = ["A", "B", "C", "D"];

export function ManualQuizForm({ action }: ManualQuizFormProps) {
  const [questions, setQuestions] = useState<QuestionDraft[]>([{ id: 1 }]);
  const questionIds = questions.map((question) => question.id).join(",");

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="questionIds" value={questionIds} />

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-200">Quiz title</span>
        <input
          name="title"
          type="text"
          required
          placeholder="Chapter 4 practice quiz"
          className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
        />
      </label>

      <div className="space-y-3">
        {questions.map((question, index) => (
          <div key={question.id} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Question {index + 1}</p>
              {questions.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  className="h-9 border border-white/10 px-3 text-xs"
                  onClick={() =>
                    setQuestions((current) => current.filter((item) => item.id !== question.id))
                  }
                >
                  Remove
                </Button>
              ) : null}
            </div>

            <div className="space-y-3">
              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Question
                </span>
                <textarea
                  name={`question-${question.id}`}
                  required
                  rows={2}
                  placeholder="Write a multiple-choice question."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
                />
              </label>

              <div className="grid gap-3">
                {choiceLabels.map((label, choiceIndex) => (
                  <label key={`${question.id}-${label}`} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name={`correct-${question.id}`}
                      value={choiceIndex}
                      required
                      className="h-4 w-4 accent-cyan-300"
                    />
                    <span className="w-5 text-sm font-semibold text-cyan-200">{label}</span>
                    <input
                      name={`choice-${question.id}-${choiceIndex}`}
                      type="text"
                      required
                      placeholder={`Answer choice ${label}`}
                      className="h-11 min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
                    />
                  </label>
                ))}
              </div>

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Explanation
                </span>
                <textarea
                  name={`explanation-${question.id}`}
                  rows={2}
                  placeholder="Optional explanation shown after submission."
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
            setQuestions((current) => [
              ...current,
              { id: Math.max(...current.map((question) => question.id)) + 1 },
            ])
          }
        >
          Add question
        </Button>
        <ActionSubmitButton label="Save manual quiz" pendingLabel="Saving..." />
      </div>
    </form>
  );
}
