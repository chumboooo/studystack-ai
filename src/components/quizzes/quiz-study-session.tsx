"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/ui/math-text";
import { buildDocumentChunkUrl } from "@/lib/documents";

type QuizQuestion = {
  id: string;
  question: string;
  choices: string[];
  correct_choice_index: number;
  explanation: string;
  source_document_id: string | null;
  source_document_title: string | null;
  source_chunk_index: number | null;
};

export function QuizStudySession({ questions }: { questions: QuizQuestion[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const activeQuestion = questions[activeIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round(((activeIndex + 1) / Math.max(questions.length, 1)) * 100);
  const score = useMemo(
    () =>
      questions.reduce(
        (count, question) =>
          answers[question.id] === question.correct_choice_index ? count + 1 : count,
        0,
      ),
    [answers, questions],
  );

  return (
    <section className="mx-auto flex min-h-[calc(100vh-13rem)] w-full max-w-5xl flex-col justify-center gap-6">
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white">
              Question {activeIndex + 1} of {questions.length}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {submitted
                ? `Score ${score} / ${questions.length}`
                : `${answeredCount} of ${questions.length} answered`}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {submitted ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setAnswers({});
                  setSubmitted(false);
                  setActiveIndex(0);
                }}
              >
                Retake quiz
              </Button>
            ) : (
              <Button
                type="button"
                disabled={answeredCount < questions.length}
                onClick={() => setSubmitted(true)}
              >
                Submit quiz
              </Button>
            )}
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-cyan-300 transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <article className="rounded-[2.25rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_40%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] p-6 shadow-[0_24px_70px_rgba(2,6,23,0.38)] sm:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
            Practice question
          </span>
          {submitted ? (
            <span
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                answers[activeQuestion.id] === activeQuestion.correct_choice_index
                  ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                  : "border-rose-300/25 bg-rose-300/10 text-rose-100"
              }`}
            >
              {answers[activeQuestion.id] === activeQuestion.correct_choice_index ? "Correct" : "Review"}
            </span>
          ) : null}
        </div>

        <h2 className="mt-8 text-2xl font-semibold leading-tight text-white sm:text-4xl">
          <MathText>{activeQuestion.question}</MathText>
        </h2>

        <div className="mt-8 grid gap-3">
          {activeQuestion.choices.map((choice, choiceIndex) => {
            const isSelected = answers[activeQuestion.id] === choiceIndex;
            const isCorrect = activeQuestion.correct_choice_index === choiceIndex;

            return (
              <button
                key={`${activeQuestion.id}-${choiceIndex}`}
                type="button"
                disabled={submitted}
                onClick={() =>
                  setAnswers((current) => ({
                    ...current,
                    [activeQuestion.id]: choiceIndex,
                  }))
                }
                className={`rounded-2xl border p-4 text-left text-sm leading-6 transition-colors sm:p-5 sm:text-base ${
                  submitted && isCorrect
                    ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-50"
                    : submitted && isSelected && !isCorrect
                      ? "border-rose-300/30 bg-rose-300/10 text-rose-50"
                      : isSelected
                        ? "border-cyan-300/30 bg-cyan-300/10 text-white"
                        : "border-white/10 bg-white/[0.05] text-slate-200 hover:border-cyan-300/25 hover:bg-white/[0.08]"
                }`}
              >
                <span className="mr-3 font-semibold text-cyan-200">
                  {String.fromCharCode(65 + choiceIndex)}.
                </span>
                <MathText>{choice}</MathText>
              </button>
            );
          })}
        </div>

        {submitted ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/55 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Explanation
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              <MathText>{activeQuestion.explanation}</MathText>
            </p>
          </div>
        ) : null}
      </article>

      <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {activeQuestion.source_document_title ?? "Manual quiz question"}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {activeQuestion.source_chunk_index === null
              ? "Created by you"
              : `Source section ${activeQuestion.source_chunk_index + 1}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {activeQuestion.source_document_id && activeQuestion.source_chunk_index !== null ? (
            <Button
              href={buildDocumentChunkUrl(
                activeQuestion.source_document_id,
                activeQuestion.source_chunk_index,
              )}
              variant="secondary"
            >
              Open source
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            disabled={activeIndex === 0}
            onClick={() => setActiveIndex((current) => Math.max(current - 1, 0))}
          >
            Back
          </Button>
          <Button
            type="button"
            disabled={activeIndex === questions.length - 1}
            onClick={() => setActiveIndex((current) => Math.min(current + 1, questions.length - 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}
