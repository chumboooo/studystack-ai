"use client";

import { useEffect, useMemo, useState } from "react";
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

type ReviewMode = "all" | "missed";

export function QuizStudySession({ questions }: { questions: QuizQuestion[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [reviewMode, setReviewMode] = useState<ReviewMode>("all");
  const [retryIds, setRetryIds] = useState<string[] | null>(null);
  const [showResults, setShowResults] = useState(false);

  const missedQuestionIds = useMemo(
    () =>
      questions
        .filter((question) => answers[question.id] !== question.correct_choice_index)
        .map((question) => question.id),
    [answers, questions],
  );

  const visibleQuestions = useMemo(() => {
    if (reviewMode === "missed" && retryIds) {
      return questions.filter((question) => retryIds.includes(question.id));
    }

    return questions;
  }, [questions, retryIds, reviewMode]);

  const currentIndex = Math.min(activeIndex, Math.max(visibleQuestions.length - 1, 0));
  const activeQuestion = visibleQuestions[currentIndex] ?? visibleQuestions[0] ?? null;
  const answeredCount = visibleQuestions.filter((question) => answers[question.id] !== undefined).length;
  const progress = Math.round(((currentIndex + 1) / Math.max(visibleQuestions.length, 1)) * 100);
  const score = useMemo(
    () =>
      questions.reduce(
        (count, question) =>
          answers[question.id] === question.correct_choice_index ? count + 1 : count,
        0,
      ),
    [answers, questions],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!activeQuestion) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();

      if (tagName === "input" || tagName === "textarea" || tagName === "select") {
        return;
      }

      if (["1", "2", "3", "4"].includes(event.key) && !submitted) {
        event.preventDefault();
        const choiceIndex = Number.parseInt(event.key, 10) - 1;

        if (choiceIndex >= 0 && choiceIndex < activeQuestion.choices.length) {
          setAnswers((current) => ({
            ...current,
            [activeQuestion.id]: choiceIndex,
          }));
        }
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((current) => Math.min(current + 1, Math.max(visibleQuestions.length - 1, 0)));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((current) => Math.max(current - 1, 0));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeQuestion, submitted, visibleQuestions.length]);

  function resetSession() {
    setAnswers({});
    setSubmitted(false);
    setReviewMode("all");
    setRetryIds(null);
    setShowResults(false);
    setActiveIndex(0);
  }

  function beginMissedOnlyRetry() {
    if (missedQuestionIds.length === 0) {
      return;
    }

    setAnswers({});
    setSubmitted(false);
    setReviewMode("missed");
    setRetryIds(missedQuestionIds);
    setShowResults(false);
    setActiveIndex(0);
  }

  if (!activeQuestion) {
    return null;
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-13rem)] w-full max-w-6xl flex-col justify-center gap-6">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">
                Question {currentIndex + 1} of {visibleQuestions.length}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {submitted
                  ? `Score ${score} / ${questions.length}`
                  : `${answeredCount} of ${visibleQuestions.length} answered`}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {submitted ? (
                <>
                  {missedQuestionIds.length > 0 ? (
                    <Button type="button" variant="secondary" onClick={beginMissedOnlyRetry}>
                      Retry missed only
                    </Button>
                  ) : null}
                  <Button type="button" variant="secondary" onClick={resetSession}>
                    Retake all
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  disabled={answeredCount < visibleQuestions.length}
                  onClick={() => {
                    setSubmitted(true);
                    setShowResults(true);
                    setActiveIndex(0);
                  }}
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

        <div className="grid grid-cols-2 gap-3 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Correct</p>
            <p className="mt-3 text-2xl font-semibold text-white">{score}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Missed</p>
            <p className="mt-3 text-2xl font-semibold text-white">{questions.length - score}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Mode</p>
            <p className="mt-3 text-sm font-medium text-white">
              {reviewMode === "missed" ? "Missed-only retry" : "Full quiz"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Shortcuts</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">1-4 answer | arrows navigate</p>
          </div>
        </div>
      </div>

      {showResults && submitted ? (
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Quiz summary
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                {score === questions.length
                  ? "Perfect score."
                  : `You answered ${score} of ${questions.length} correctly.`}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                Review explanations below, jump to any question from the index, or retry just the questions you missed.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {missedQuestionIds.length > 0 ? (
                <Button type="button" onClick={beginMissedOnlyRetry}>
                  Retry missed questions
                </Button>
              ) : null}
              <Button type="button" variant="secondary" onClick={() => setShowResults(false)}>
                Continue review
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.3fr_1fr]">
        <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Question index
            </p>
            {reviewMode === "missed" ? (
              <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-amber-100">
                Missed only
              </span>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5 xl:grid-cols-3">
            {visibleQuestions.map((question, index) => {
              const selected = index === currentIndex;
              const isAnswered = answers[question.id] !== undefined;
              const isCorrect = answers[question.id] === question.correct_choice_index;

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition-colors ${
                    selected
                      ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-100"
                      : submitted && isCorrect
                        ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                        : submitted && isAnswered
                          ? "border-rose-300/25 bg-rose-300/10 text-rose-100"
                          : isAnswered
                            ? "border-white/10 bg-white/10 text-white"
                            : "border-white/10 bg-slate-950/35 text-slate-400 hover:text-white"
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </aside>

        <article className="rounded-[2.25rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_40%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] p-6 shadow-[0_24px_70px_rgba(2,6,23,0.38)] sm:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
              {reviewMode === "missed" ? "Missed question review" : "Practice question"}
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
              <div className="mt-3 text-sm leading-7 text-slate-200">
                <MathText>{activeQuestion.explanation}</MathText>
              </div>
            </div>
          ) : null}
        </article>
      </div>

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
            disabled={currentIndex === 0}
            onClick={() => setActiveIndex((current) => Math.max(current - 1, 0))}
          >
            Back
          </Button>
          <Button
            type="button"
            disabled={currentIndex === visibleQuestions.length - 1}
            onClick={() => setActiveIndex((current) => Math.min(current + 1, visibleQuestions.length - 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}
