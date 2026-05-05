"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/ui/math-text";
import { buildDocumentChunkUrl } from "@/lib/documents";

type Flashcard = {
  id: string;
  prompt: string;
  answer: string;
  source_document_id: string | null;
  source_document_title: string | null;
  source_chunk_index: number | null;
};

type CardRating = "easy" | "medium" | "hard";
type FilterMode = "all" | "starred" | "needs-review" | "unrated";

function shuffleCards(cards: Flashcard[]) {
  return cards
    .map((card) => ({ card, sort: Math.random() }))
    .sort((left, right) => left.sort - right.sort)
    .map(({ card }) => card);
}

function getRatingTone(rating: CardRating) {
  if (rating === "easy") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }

  if (rating === "medium") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  return "border-rose-300/25 bg-rose-300/10 text-rose-100";
}

function getFilterLabel(mode: FilterMode) {
  switch (mode) {
    case "starred":
      return "Starred";
    case "needs-review":
      return "Needs review";
    case "unrated":
      return "Unrated";
    default:
      return "All cards";
  }
}

export function FlashcardStudySession({ cards }: { cards: Flashcard[] }) {
  const [cardOrder, setCardOrder] = useState(cards);
  const [activeIndex, setActiveIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [starredIds, setStarredIds] = useState<Record<string, boolean>>({});
  const [ratings, setRatings] = useState<Record<string, CardRating>>({});
  const [visitedIds, setVisitedIds] = useState<Record<string, boolean>>({});

  const filteredCards = useMemo(() => {
    switch (filterMode) {
      case "starred":
        return cardOrder.filter((card) => starredIds[card.id]);
      case "needs-review":
        return cardOrder.filter((card) => ratings[card.id] === "hard" || ratings[card.id] === "medium");
      case "unrated":
        return cardOrder.filter((card) => !ratings[card.id]);
      default:
        return cardOrder;
    }
  }, [cardOrder, filterMode, ratings, starredIds]);

  const currentIndex = Math.min(activeIndex, Math.max(filteredCards.length - 1, 0));
  const activeCard = filteredCards[currentIndex] ?? filteredCards[0] ?? null;
  const progress = useMemo(
    () => Math.round(((currentIndex + 1) / Math.max(filteredCards.length, 1)) * 100),
    [currentIndex, filteredCards.length],
  );

  const summary = useMemo(() => {
    const easy = Object.values(ratings).filter((rating) => rating === "easy").length;
    const medium = Object.values(ratings).filter((rating) => rating === "medium").length;
    const hard = Object.values(ratings).filter((rating) => rating === "hard").length;

    return {
      easy,
      medium,
      hard,
      starred: Object.values(starredIds).filter(Boolean).length,
      studied: Object.keys(visitedIds).length,
    };
  }, [ratings, starredIds, visitedIds]);

  const showSummary = filteredCards.length > 0 && filteredCards.every((card) => ratings[card.id]);

  const goToCard = useCallback(
    (nextIndex: number) => {
      setActiveIndex(Math.min(Math.max(nextIndex, 0), Math.max(filteredCards.length - 1, 0)));
      setFlipped(false);
    },
    [filteredCards.length],
  );

  const markViewed = useCallback((cardId: string) => {
    setVisitedIds((current) => (current[cardId] ? current : { ...current, [cardId]: true }));
  }, []);

  const handleFlip = useCallback(() => {
    if (!activeCard) {
      return;
    }

    setFlipped((current) => {
      const next = !current;

      if (next) {
        markViewed(activeCard.id);
      }

      return next;
    });
  }, [activeCard, markViewed]);

  const handleRate = useCallback(
    (rating: CardRating) => {
      if (!activeCard) {
        return;
      }

      setRatings((current) => ({
        ...current,
        [activeCard.id]: rating,
      }));

      if (currentIndex < filteredCards.length - 1) {
        goToCard(currentIndex + 1);
      }
    },
    [activeCard, currentIndex, filteredCards.length, goToCard],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!activeCard) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();

      if (tagName === "input" || tagName === "textarea" || tagName === "select") {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToCard(currentIndex + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToCard(currentIndex - 1);
      } else if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        handleFlip();
      } else if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        setStarredIds((current) => ({
          ...current,
          [activeCard.id]: !current[activeCard.id],
        }));
      } else if (flipped && ["1", "2", "3"].includes(event.key)) {
        event.preventDefault();
        handleRate(event.key === "1" ? "hard" : event.key === "2" ? "medium" : "easy");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCard, currentIndex, flipped, goToCard, handleFlip, handleRate]);

  if (!activeCard) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-13rem)] w-full max-w-5xl flex-col justify-center gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
          <p className="text-lg font-semibold text-white">No cards match this view.</p>
          <p className="mt-2 text-sm text-slate-400">
            Switch back to all cards or adjust your review filter.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button type="button" onClick={() => setFilterMode("all")}>
              Show all cards
            </Button>
            <Button type="button" variant="secondary" onClick={() => setFilterMode("unrated")}>
              Show unrated
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-13rem)] w-full max-w-6xl flex-col justify-center gap-6">
      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-slate-950/45 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">
                Card {currentIndex + 1} of {filteredCards.length}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {getFilterLabel(filterMode)} | {summary.studied} reviewed | {summary.starred} starred
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "unrated", "needs-review", "starred"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setFilterMode(mode);
                    setActiveIndex(0);
                    setFlipped(false);
                  }}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
                    filterMode === mode
                      ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-100"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-300/20 hover:text-white"
                  }`}
                >
                  {getFilterLabel(mode)}
                </button>
              ))}
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-cyan-300 transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
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
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFilterMode("all");
                setRatings({});
                setVisitedIds({});
                setStarredIds({});
                setCardOrder(cards);
                setActiveIndex(0);
                setFlipped(false);
              }}
            >
              Restart session
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Easy</p>
            <p className="mt-3 text-2xl font-semibold text-white">{summary.easy}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Medium</p>
            <p className="mt-3 text-2xl font-semibold text-white">{summary.medium}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Hard</p>
            <p className="mt-3 text-2xl font-semibold text-white">{summary.hard}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Shortcuts</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">Space flip | 1/2/3 rate | S star</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleFlip}
        className="group min-h-[22rem] rounded-[2.25rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] p-8 text-left shadow-[0_24px_70px_rgba(2,6,23,0.38)] outline-none transition-colors hover:border-cyan-300/35 focus-visible:ring-2 focus-visible:ring-cyan-300/70 sm:min-h-[28rem] sm:p-12"
        aria-label={flipped ? "Show front of flashcard" : "Reveal flashcard answer"}
      >
        <div className="flex h-full min-h-[18rem] flex-col justify-between gap-8 sm:min-h-[22rem]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                {flipped ? "Back" : "Front"}
              </span>
              {ratings[activeCard.id] ? (
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getRatingTone(ratings[activeCard.id])}`}
                >
                  {ratings[activeCard.id]}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setStarredIds((current) => ({
                  ...current,
                  [activeCard.id]: !current[activeCard.id],
                }));
              }}
              className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
                starredIds[activeCard.id]
                  ? "border-amber-300/30 bg-amber-300/12 text-amber-100"
                  : "border-white/10 bg-white/5 text-slate-300 hover:text-white"
              }`}
            >
              {starredIds[activeCard.id] ? "Starred" : "Star card"}
            </button>
          </div>

          <div className="mx-auto max-w-3xl text-center">
            <div className="text-2xl font-semibold leading-tight text-white sm:text-4xl">
              <MathText>{flipped ? activeCard.answer : activeCard.prompt}</MathText>
            </div>
          </div>

          <div className="flex justify-center">
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-300">
              {flipped ? "Rate the card, then move on." : "Think of the answer before flipping."}
            </span>
          </div>
        </div>
      </button>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {activeCard.source_document_title ?? "Manual flashcard"}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {activeCard.source_chunk_index === null
                  ? "Created by you"
                  : `Source section ${activeCard.source_chunk_index + 1}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {activeCard.source_document_id && activeCard.source_chunk_index !== null ? (
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
                disabled={currentIndex === 0}
                onClick={() => goToCard(currentIndex - 1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                disabled={currentIndex === filteredCards.length - 1}
                onClick={() => goToCard(currentIndex + 1)}
              >
                Next
              </Button>
            </div>
          </div>

          {flipped ? (
            <div className="flex flex-wrap gap-3">
              {(["hard", "medium", "easy"] as const).map((rating) => (
                <Button
                  key={rating}
                  type="button"
                  variant={rating === "easy" ? "primary" : "secondary"}
                  onClick={() => handleRate(rating)}
                >
                  Mark {rating}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Session summary
            </p>
            {showSummary ? (
              <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">
                Review complete
              </span>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Recommended next</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                {summary.hard > 0
                  ? "Switch to Needs review to repeat the cards you marked hard or medium."
                  : summary.starred > 0
                    ? "Review starred cards before ending the session."
                    : "You are in a good spot to reshuffle or move to a quiz."}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Coverage</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                {summary.studied} of {cardOrder.length} cards opened this session.
              </p>
            </div>
          </div>
        </div>
      </div>

      <details className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
        <summary className="cursor-pointer text-sm font-semibold text-white">
          Terms and definitions overview
        </summary>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {cardOrder.map((card, index) => (
            <div key={card.id} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.16em] text-slate-500">Card {index + 1}</span>
                {ratings[card.id] ? (
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] ${getRatingTone(ratings[card.id])}`}
                  >
                    {ratings[card.id]}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">Prompt</p>
                  <div className="mt-2 text-sm leading-7 text-white">
                    <MathText>{card.prompt}</MathText>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Answer</p>
                  <div className="mt-2 text-sm leading-7 text-slate-300">
                    <MathText>{card.answer}</MathText>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
