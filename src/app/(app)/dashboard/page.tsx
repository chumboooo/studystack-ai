import Link from "next/link";
import { createPlannerEntry, deletePlannerEntry } from "@/app/(app)/dashboard/actions";
import { PageHeader } from "@/components/app/page-header";
import { StudyPlannerCalendar } from "@/components/dashboard/study-planner-calendar";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getDemoWorkspaceData } from "@/lib/demo/data";
import { isDemoSession } from "@/lib/demo/mode";
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

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const [{ error: pageError, message }] = await Promise.all([searchParams]);
  const demoMode = await isDemoSession();

  const [documents, chatSessions, flashcardSets, quizSets, plannerEntries, plannerError] = demoMode
    ? (() => {
        const demoData = getDemoWorkspaceData();

        return [
          demoData.documents.map((document) => ({
            id: document.id,
            title: document.title,
            created_at: document.created_at,
            document_contents: {
              extraction_status: document.extraction_status,
            },
          })),
          demoData.chatSessions.map((session) => ({
            id: session.id,
            title: session.title,
            updated_at: session.updated_at,
          })),
          demoData.flashcardSets.map((set) => ({
            id: set.id,
            title: set.title,
            source_mode: set.source_mode,
            updated_at: set.updated_at,
            flashcards: set.cards.map((card) => ({ id: card.id })),
          })),
          demoData.quizSets.map((set) => ({
            id: set.id,
            title: set.title,
            source_mode: set.source_mode,
            updated_at: set.updated_at,
            quiz_questions: set.questions.map((question) => ({ id: question.id })),
          })),
          demoData.plannerEntries,
          null,
        ] as const;
      })()
    : await (async () => {
        const supabase = await createClient();
        const [
          { data: documentsData },
          { data: chatSessionsData },
          { data: flashcardSetsData },
          { data: quizSetsData },
          { data: plannerEntriesData, error: plannerEntriesError },
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

        return [
          documentsData ?? [],
          chatSessionsData ?? [],
          flashcardSetsData ?? [],
          quizSetsData ?? [],
          plannerEntriesData ?? [],
          plannerEntriesError,
        ] as const;
      })();

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
  const latestChat = chatSessions[0] ?? null;
  const latestFlashcards = flashcardSets[0] ?? null;
  const latestQuiz = quizSets[0] ?? null;
  const plans = plannerEntries;

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
      <PageHeader
        badge="Dashboard"
        title="Decide what to study next."
        description="Resume your work, plan upcoming study sessions, and move straight into the next useful action."
        actions={
          <>
            <Button href="/chat?new=1">Ask a question</Button>
            <Button href="#study-planner" variant="secondary">
              Add study plan
            </Button>
          </>
        }
      />

      {pageError ? <AlertBanner tone="error">{pageError}</AlertBanner> : null}
      {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}
      {plannerError ? (
        <AlertBanner tone="error">Study planner entries could not load right now.</AlertBanner>
      ) : null}
      {demoMode ? (
        <AlertBanner tone="info">
          Demo mode uses seeded study data for the dashboard and planner so the workspace can be shown without a live database.
        </AlertBanner>
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

        <Card className="surface-enter space-y-5">
          <div>
            <CardTitle>Recommended next step</CardTitle>
            <CardDescription>{recommendedStep.detail}</CardDescription>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-5">
            <p className="text-xl font-semibold text-white">{recommendedStep.title}</p>
            <Button href={recommendedStep.href} className="mt-5">
              {recommendedStep.action}
            </Button>
          </div>
        </Card>
      </div>

      <div id="study-planner">
        <Card className="surface-enter space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Study planner</CardTitle>
              <CardDescription>
                Click a day to view plans, add a study reminder, or clear finished items.
              </CardDescription>
            </div>
          </div>
          <StudyPlannerCalendar
            entries={plans}
            createAction={createPlannerEntry}
            deleteAction={deletePlannerEntry}
          />
        </Card>
      </div>
    </div>
  );
}
