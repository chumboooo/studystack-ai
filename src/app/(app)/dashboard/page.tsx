import Link from "next/link";
import { createPlannerEntry, deletePlannerEntry } from "@/app/(app)/dashboard/actions";
import { ActionSubmitButton, ConfirmActionSubmitButton } from "@/components/study-tools/action-submit-button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatDocumentDate } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

type DashboardPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

function getCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function getDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function getCalendarDays(plansByDate: Map<string, number>) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Array<{
    key: string;
    day: number | null;
    isToday: boolean;
    planCount: number;
  }> = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    days.push({
      key: `blank-${index}`,
      day: null,
      isToday: false,
      planCount: 0,
    });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(year, month, day);
    const key = getDateKey(date);
    days.push({
      key,
      day,
      isToday: key === getDateKey(today),
      planCount: plansByDate.get(key) ?? 0,
    });
  }

  return {
    days,
    label: today.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
  };
}

function getEntryTypeLabel(type: string) {
  const labels: Record<string, string> = {
    study_session: "Study session",
    quiz_review: "Quiz review",
    exam_prep: "Exam prep",
    reminder: "Reminder",
  };

  return labels[type] ?? "Study plan";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const [{ error: pageError, message }, supabase] = await Promise.all([
    searchParams,
    createClient(),
  ]);

  const [
    { data: documents },
    { data: chatSessions },
    { data: flashcardSets },
    { data: quizSets },
    { data: plannerEntries, error: plannerError },
  ] = await Promise.all([
    supabase
      .from("documents")
      .select("id, title, created_at, document_contents(extraction_status)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("chat_sessions")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(3),
    supabase
      .from("flashcard_sets")
      .select("id, title, source_mode, updated_at, flashcards(id)")
      .order("updated_at", { ascending: false })
      .limit(3),
    supabase
      .from("quiz_sets")
      .select("id, title, source_mode, updated_at, quiz_questions(id)")
      .order("updated_at", { ascending: false })
      .limit(3),
    supabase
      .from("study_planner_entries")
      .select("id, title, entry_date, entry_type, note, created_at")
      .order("entry_date", { ascending: true })
      .limit(12),
  ]);

  const normalizedDocuments = (documents ?? []).map((document) => ({
    ...document,
    content: Array.isArray(document.document_contents)
      ? document.document_contents[0]
      : document.document_contents,
  }));
  const readyDocuments = normalizedDocuments.filter(
    (document) => document.content?.extraction_status === "completed",
  );
  const latestReadyDocument = readyDocuments[0] ?? null;
  const latestDocument = normalizedDocuments[0] ?? null;
  const latestChat = chatSessions?.[0] ?? null;
  const latestFlashcards = flashcardSets?.[0] ?? null;
  const latestQuiz = quizSets?.[0] ?? null;
  const plans = plannerEntries ?? [];
  const plansByDate = plans.reduce((map, entry) => {
    map.set(entry.entry_date, (map.get(entry.entry_date) ?? 0) + 1);

    return map;
  }, new Map<string, number>());
  const calendar = getCalendarDays(plansByDate);

  const recommendedStep = (() => {
    if (!latestDocument) {
      return {
        title: "Upload notes to begin",
        detail: "Attach a PDF in Chat so StudyStack can answer questions and help you build study tools.",
        href: "/chat?new=1",
        action: "Start in chat",
      };
    }

    if (!latestReadyDocument) {
      return {
        title: "Check your source library",
        detail: "Your newest material is still getting ready or needs another try before studying.",
        href: "/documents",
        action: "Open library",
      };
    }

    if (!latestChat) {
      return {
        title: "Ask a question from your notes",
        detail: `Start with ${latestReadyDocument.title} and save a grounded explanation.`,
        href: "/chat?new=1",
        action: "Ask now",
      };
    }

    if (!latestFlashcards) {
      return {
        title: "Make flashcards from a ready topic",
        detail: "Turn a document topic into active recall, or write your own cards manually.",
        href: "/flashcards",
        action: "Create cards",
      };
    }

    if (!latestQuiz) {
      return {
        title: "Build a short practice quiz",
        detail: "Check your understanding with multiple-choice practice from your notes.",
        href: "/quizzes",
        action: "Build quiz",
      };
    }

    return {
      title: "Schedule your next review",
      detail: "You have study tools ready. Add a planner item so the next session has a clear target.",
      href: "#study-planner",
      action: "Plan review",
    };
  })();

  const continueItems = [
    {
      label: "Chat",
      title: latestChat?.title ?? "Start a study conversation",
      detail: latestChat ? `Updated ${formatDocumentDate(latestChat.updated_at)}` : "Ask from your notes.",
      href: latestChat ? `/chat?session=${latestChat.id}` : "/chat?new=1",
      action: "Resume chat",
    },
    {
      label: "Flashcards",
      title: latestFlashcards?.title ?? "Create a card set",
      detail: latestFlashcards
        ? `${getCount(latestFlashcards.flashcards)} cards`
        : "Generate or write your own.",
      href: latestFlashcards ? `/flashcards/${latestFlashcards.id}` : "/flashcards",
      action: "Review cards",
    },
    {
      label: "Quiz",
      title: latestQuiz?.title ?? "Build a practice quiz",
      detail: latestQuiz ? `${getCount(latestQuiz.quiz_questions)} questions` : "Practice when ready.",
      href: latestQuiz ? `/quizzes/${latestQuiz.id}` : "/quizzes",
      action: "Continue quiz",
    },
    {
      label: "Source",
      title: latestDocument?.title ?? "Upload study material",
      detail: latestDocument ? "Open source document" : "Add notes or slides.",
      href: latestDocument ? `/documents/${latestDocument.id}` : "/documents",
      action: "Open source",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-enter rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.22)] sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Study command center
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Decide what to study next.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Resume your work, plan upcoming study sessions, and jump into the next useful action.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/chat?new=1">Ask a question</Button>
            <Button href="#study-planner" variant="secondary">
              Add study plan
            </Button>
          </div>
        </div>
      </section>

      {pageError ? <AlertBanner tone="error">{pageError}</AlertBanner> : null}
      {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}
      {plannerError ? (
        <AlertBanner tone="error">Study planner entries could not load right now.</AlertBanner>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="surface-enter space-y-5">
          <div>
            <CardTitle>Continue studying</CardTitle>
            <CardDescription>Pick up the latest chat, flashcards, quiz, or source.</CardDescription>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {continueItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="soft-hover flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/50 p-4"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">{item.label}</p>
                  <p className="mt-3 line-clamp-2 text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{item.detail}</p>
                </div>
                <p className="mt-4 text-sm font-medium text-cyan-100">{item.action}</p>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="surface-enter space-y-5 border-cyan-300/15 bg-cyan-300/[0.06]">
          <div>
            <CardTitle>Recommended next step</CardTitle>
            <CardDescription>{recommendedStep.detail}</CardDescription>
          </div>
          <div className="rounded-2xl border border-cyan-300/20 bg-slate-950/45 p-5">
            <p className="text-xl font-semibold text-white">{recommendedStep.title}</p>
            <Button href={recommendedStep.href} className="mt-5">
              {recommendedStep.action}
            </Button>
          </div>
        </Card>
      </div>

      <div id="study-planner" className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="surface-enter space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Study planner</CardTitle>
              <CardDescription>Add study sessions, quiz reviews, exam prep, and reminders.</CardDescription>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              {calendar.label}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs text-slate-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendar.days.map((day) => (
              <div
                key={day.key}
                className={`relative flex aspect-square min-h-11 items-center justify-center rounded-2xl border text-sm ${
                  day.day === null
                    ? "border-transparent"
                    : day.isToday
                      ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-50"
                      : day.planCount > 0
                        ? "border-cyan-300/20 bg-cyan-300/10 text-white"
                        : "border-white/10 bg-slate-950/40 text-slate-400"
                }`}
              >
                {day.day}
                {day.planCount > 0 ? (
                  <span className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-cyan-300" />
                ) : null}
              </div>
            ))}
          </div>

          <div className="grid gap-3">
            {plans.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm leading-6 text-slate-400">
                No planned study sessions yet. Add one so your next review has a clear target.
              </p>
            ) : (
              plans.slice(0, 5).map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{plan.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-cyan-300">
                        {getEntryTypeLabel(plan.entry_type)} - {formatDocumentDate(plan.entry_date)}
                      </p>
                      {plan.note ? (
                        <p className="mt-2 text-sm leading-6 text-slate-400">{plan.note}</p>
                      ) : null}
                    </div>
                    <form action={deletePlannerEntry}>
                      <input type="hidden" name="entryId" value={plan.id} />
                      <ConfirmActionSubmitButton
                        label="Delete"
                        pendingLabel="Deleting..."
                        confirmMessage={`Delete "${plan.title}" from your planner?`}
                        variant="ghost"
                        className="border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs text-rose-100 hover:bg-rose-400/20"
                      />
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="surface-enter space-y-5">
            <div>
              <CardTitle>Add a study plan</CardTitle>
              <CardDescription>Keep it simple: what to study, when, and why.</CardDescription>
            </div>
            <form action={createPlannerEntry} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">Title</span>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="Review integration by parts"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Date</span>
                  <input
                    name="entryDate"
                    type="date"
                    required
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors focus:border-cyan-300/40"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Type</span>
                  <select
                    name="entryType"
                    defaultValue="study_session"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors focus:border-cyan-300/40"
                  >
                    <option value="study_session">Study session</option>
                    <option value="quiz_review">Quiz review</option>
                    <option value="exam_prep">Exam prep</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </label>
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">Note</span>
                <textarea
                  name="note"
                  rows={3}
                  placeholder="Optional goal, topic, or reminder."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
                />
              </label>
              <div className="flex justify-end">
                <ActionSubmitButton label="Save plan" pendingLabel="Saving..." />
              </div>
            </form>
          </Card>

          <Card className="surface-enter space-y-5">
            <div>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Start the core study tasks without digging through pages.</CardDescription>
            </div>
            <div className="grid gap-3">
              {[
                { label: "Ask a question", href: "/chat?new=1" },
                { label: "Upload notes", href: "/documents" },
                { label: "Create flashcards", href: "/flashcards" },
                { label: "Build a quiz", href: "/quizzes" },
                { label: "Create manual flashcards", href: "/flashcards" },
                { label: "Create manual quiz", href: "/quizzes" },
              ].map((action) => (
                <Button
                  key={action.label}
                  href={action.href}
                  variant="secondary"
                  className="justify-between rounded-2xl"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
