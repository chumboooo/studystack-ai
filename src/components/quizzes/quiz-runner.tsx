"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildDocumentChunkUrl } from "@/lib/documents";

type QuizQuestion = {
  id: string;
  question: string;
  choices: string[];
  correct_choice_index: number;
  explanation: string;
  source_document_id: string | null;
  source_document_title: string;
  source_chunk_index: number;
};

export function QuizRunner({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <div>
          <p className="text-sm font-medium text-white">Quiz attempt</p>
          <p className="mt-1 text-sm text-slate-400">
            {submitted
              ? `Score ${score} / ${questions.length}`
              : "Choose one answer per question, then submit to see explanations."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {!submitted ? (
            <Button type="button" onClick={() => setSubmitted(true)}>
              Submit answers
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setAnswers({});
                setSubmitted(false);
              }}
            >
              Retake quiz
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {questions.map((question, questionIndex) => (
          <div key={question.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-200">
                Question {questionIndex + 1}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                Chunk {question.source_chunk_index + 1}
              </span>
            </div>

            <p className="mt-4 text-base leading-7 text-white">{question.question}</p>

            <div className="mt-5 grid gap-3">
              {question.choices.map((choice, choiceIndex) => {
                const isSelected = answers[question.id] === choiceIndex;
                const isCorrect = question.correct_choice_index === choiceIndex;
                const showState = submitted;

                return (
                  <label
                    key={`${question.id}-${choiceIndex}`}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
                      showState && isCorrect
                        ? "border-emerald-400/25 bg-emerald-400/10"
                        : showState && isSelected && !isCorrect
                          ? "border-rose-400/25 bg-rose-400/10"
                          : isSelected
                            ? "border-cyan-300/25 bg-cyan-300/10"
                            : "border-white/10 bg-slate-950/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      checked={isSelected}
                      disabled={submitted}
                      onChange={() =>
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: choiceIndex,
                        }))
                      }
                    />
                    <span className="text-sm leading-6 text-slate-200">{choice}</span>
                  </label>
                );
              })}
            </div>

            {submitted ? (
              <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-sm font-medium text-white">
                  {answers[question.id] === question.correct_choice_index ? "Correct" : "Review"}
                </p>
                <p className="text-sm leading-6 text-slate-300">{question.explanation}</p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-400">
                    Source: {question.source_document_title}, chunk {question.source_chunk_index + 1}
                  </p>
                  {question.source_document_id ? (
                    <Button
                      href={buildDocumentChunkUrl(
                        question.source_document_id,
                        question.source_chunk_index,
                      )}
                      variant="secondary"
                    >
                      Open source
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
