import { deleteChatSession, deleteChatTurn, submitGroundedQuestion } from "@/app/(app)/chat/actions";
import { PageHeader } from "@/components/app/page-header";
import { AskQuestionButton } from "@/components/chat/ask-question-button";
import { DeleteChatSessionForm } from "@/components/chat/delete-chat-session-button";
import { DeleteChatTurnForm } from "@/components/chat/delete-chat-turn-button";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MathText } from "@/components/ui/math-text";
import { buildDocumentChunkUrl, formatDocumentDate } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

type ChatPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    q?: string;
    session?: string;
    turn?: string;
  }>;
};

function getStatusTone(status: "completed" | "failed" | "no_sources") {
  if (status === "completed") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "failed") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-200";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-200";
}

function getStatusLabel(status: "completed" | "failed" | "no_sources") {
  if (status === "completed") {
    return "Answered";
  }

  if (status === "failed") {
    return "Could not answer";
  }

  return "No match found";
}

function getChunkPreview(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (normalized.length <= 260) {
    return normalized;
  }

  return `${normalized.slice(0, 257)}...`;
}

function formatAnswerForDisplay(content: string) {
  return content
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const [{ error: pageError, message, q, session, turn }, supabase] = await Promise.all([
    searchParams,
    createClient(),
  ]);
  const draftQuestion = q?.trim() ?? "";

  const { data: sessionsData, error: sessionsError } = await supabase
    .from("chat_sessions")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(10);

  const { data: recentTurnsData, error: recentTurnsError } = await supabase
    .from("chat_turns")
    .select("id, session_id, question, status, created_at")
    .order("created_at", { ascending: false })
    .limit(12);

  const sessions = sessionsData ?? [];
  const recentTurns = recentTurnsData ?? [];

  let selectedTurn =
    turn && turn.trim().length > 0
      ? (
          await supabase
            .from("chat_turns")
            .select("id, session_id, question, answer, status, error_message, created_at")
            .eq("id", turn)
            .maybeSingle()
        ).data
      : null;

  const activeSessionId =
    selectedTurn?.session_id ??
    (session && session.trim().length > 0 ? session : recentTurns[0]?.session_id ?? null);

  const { data: activeSessionTurnsData, error: sessionTurnsError } = activeSessionId
    ? await supabase
        .from("chat_turns")
        .select("id, session_id, question, status, created_at")
        .eq("session_id", activeSessionId)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  const activeSessionTurns = activeSessionTurnsData ?? [];

  if (!selectedTurn && activeSessionTurns.length > 0) {
    const latestTurnId = activeSessionTurns[0].id;
    selectedTurn = (
      await supabase
        .from("chat_turns")
        .select("id, session_id, question, answer, status, error_message, created_at")
        .eq("id", latestTurnId)
        .maybeSingle()
    ).data;
  }

  const { data: selectedSourcesData, error: selectedSourcesError } = selectedTurn
    ? await supabase
        .from("chat_turn_sources")
        .select(
          "id, source_label, document_id, chunk_id, document_title, chunk_index, rank, content_excerpt, created_at",
        )
        .eq("turn_id", selectedTurn.id)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  const selectedSources = selectedSourcesData ?? [];
  const activeSession = sessions.find((entry) => entry.id === activeSessionId) ?? null;
  const sessionTitleById = new Map(sessions.map((entry) => [entry.id, entry.title]));
  const hasDataError = recentTurnsError || sessionTurnsError || selectedSourcesError || sessionsError;

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Ask"
        title="Study chat"
        description="Ask questions about your study materials, save the answers, and review the supporting source sections anytime."
        actions={<Button href="/documents">Manage documents</Button>}
      />

      {pageError ? <AlertBanner tone="error">{pageError}</AlertBanner> : null}
      {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}
      {hasDataError ? (
        <AlertBanner tone="error">
          Your chat history could not be loaded right now. Please refresh and try again.
        </AlertBanner>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-5">
          <Card className="space-y-5">
            <div>
              <CardTitle>Ask a question</CardTitle>
              <CardDescription>
                Questions are saved to your account so you can come back to past answers and the
                source sections they came from.
              </CardDescription>
            </div>

            <form action={submitGroundedQuestion} className="space-y-4">
              {activeSessionId ? <input type="hidden" name="sessionId" value={activeSessionId} /> : null}
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-200">Question</span>
                <input
                  name="question"
                  defaultValue={draftQuestion}
                  type="text"
                  placeholder="What does the Krebs cycle produce?"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <AskQuestionButton />
                <Button href="/chat" variant="secondary">
                  New thread
                </Button>
              </div>
            </form>

            {activeSessionTurns.length > 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                    Current session
                  </p>
                  {activeSessionId ? (
                    <DeleteChatSessionForm
                      action={deleteChatSession}
                      sessionId={activeSessionId}
                      returnSessionId={activeSessionId}
                      returnTurnId={selectedTurn?.id}
                      confirmMessage="Delete this conversation and all saved answers in it? This cannot be undone."
                      label="Delete conversation"
                      pendingLabel="Deleting..."
                      className="border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-rose-100 hover:bg-rose-400/20"
                    />
                  ) : null}
                </div>
                {activeSession ? (
                  <p className="mt-2 text-base font-semibold text-white">{activeSession.title}</p>
                ) : null}
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Keep related questions together in one conversation.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-400">
                  <span>{activeSessionTurns.length} saved question{activeSessionTurns.length === 1 ? "" : "s"}</span>
                  {selectedTurn ? <span>Viewing {formatDocumentDate(selectedTurn.created_at)}</span> : null}
                </div>
                <div className="mt-4 grid gap-2">
                  {activeSessionTurns.slice(0, 5).map((sessionTurn) => (
                    <a
                      key={sessionTurn.id}
                      href={`/chat?session=${sessionTurn.session_id}&turn=${sessionTurn.id}`}
                      className={`rounded-2xl border px-4 py-3 text-sm transition-colors ${
                        selectedTurn?.id === sessionTurn.id
                          ? "border-cyan-300/30 bg-cyan-300/10 text-white"
                          : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-300/20 hover:bg-white/[0.08]"
                      }`}
                    >
                      <MathText>{sessionTurn.question}</MathText>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3">
              {[
                "Explain the difference between mitosis and meiosis.",
                "What are the outputs of glycolysis?",
                "How does supply and demand reach equilibrium?",
              ].map((prompt) => (
                <a
                  key={prompt}
                  href={`/chat?q=${encodeURIComponent(prompt)}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300 transition-colors hover:border-cyan-300/30 hover:bg-white/[0.08]"
                >
                  {prompt}
                </a>
              ))}
            </div>
          </Card>

          <Card className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Q&A</CardTitle>
                <CardDescription>Saved questions and answers for this account.</CardDescription>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                {recentTurns?.length ?? 0} shown
              </div>
            </div>

            {!recentTurns || recentTurns.length === 0 ? (
              <EmptyState
                eyebrow="No history yet"
                title="Your saved questions will appear here."
                description="Ask your first question to save the answer and its sources for later review."
                actionLabel="Browse documents"
                actionHref="/documents"
                secondaryActionLabel="Open dashboard"
                secondaryActionHref="/dashboard"
                icon={
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                    <path d="M12 7v5l3 3M4.75 12a7.25 7.25 0 1 1 14.5 0 7.25 7.25 0 0 1-14.5 0Z" />
                  </svg>
                }
              />
            ) : (
              <div className="grid gap-3">
                {recentTurns.map((historyTurn) => (
                  <div
                    key={historyTurn.id}
                    className={`rounded-2xl border p-4 transition-colors ${
                      selectedTurn?.id === historyTurn.id
                        ? "border-cyan-300/30 bg-cyan-300/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <a
                        href={`/chat?session=${historyTurn.session_id}&turn=${historyTurn.id}`}
                        className="min-w-0 flex-1"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusTone(historyTurn.status)}`}
                          >
                            {getStatusLabel(historyTurn.status)}
                          </span>
                          {sessionTitleById.get(historyTurn.session_id) ? (
                            <span className="text-xs uppercase tracking-[0.16em] text-cyan-300">
                              {sessionTitleById.get(historyTurn.session_id)}
                            </span>
                          ) : null}
                          <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
                            {formatDocumentDate(historyTurn.created_at)}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-medium leading-6 text-white">
                          <MathText>{historyTurn.question}</MathText>
                        </p>
                      </a>
                      <DeleteChatTurnForm
                        action={deleteChatTurn}
                        turnId={historyTurn.id}
                        returnSessionId={selectedTurn?.session_id}
                        returnTurnId={selectedTurn?.id}
                        confirmMessage="Delete this saved question and answer? This cannot be undone."
                        label="Delete"
                        pendingLabel="Deleting..."
                        className="border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-rose-100 hover:bg-rose-400/20"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {!selectedTurn ? (
          <EmptyState
            eyebrow="Answer"
            title="Choose a saved Q&A or ask a new question."
            description="When you ask something, StudyStack saves the answer and its sources so you can revisit it later without running it again."
            actionLabel="Browse documents"
            actionHref="/documents"
            secondaryActionLabel="Open dashboard"
            secondaryActionHref="/dashboard"
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                <path d="M4 6.75A1.75 1.75 0 0 1 5.75 5h12.5A1.75 1.75 0 0 1 20 6.75v7.5A1.75 1.75 0 0 1 18.25 16H9l-5 3V6.75Z" />
              </svg>
            }
          />
        ) : (
          <div className="space-y-5">
            <Card className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle>Answer</CardTitle>
                  <CardDescription>
                    Saved question from <span className="font-medium text-white">{formatDocumentDate(selectedTurn.created_at)}</span>
                  </CardDescription>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusTone(selectedTurn.status)}`}>
                  {getStatusLabel(selectedTurn.status)}
                </span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Question</p>
                <p className="mt-3 text-base leading-7 text-white">
                  <MathText>{selectedTurn.question}</MathText>
                </p>
              </div>

              {selectedTurn.status === "completed" ? (
                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    Answer
                  </p>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-100">
                    <MathText>{formatAnswerForDisplay(selectedTurn.answer ?? "")}</MathText>
                  </div>
                </div>
              ) : selectedTurn.status === "no_sources" ? (
                <AlertBanner tone="info">{selectedTurn.answer}</AlertBanner>
              ) : (
                <AlertBanner tone="error">
                  {selectedTurn.error_message ||
                    "This answer could not be generated, but the question was still saved."}
                </AlertBanner>
              )}

              <AlertBanner tone="info">
                Saved answers reopen from history instantly, so it is easy to review your study sessions later.
              </AlertBanner>
            </Card>

            <Card className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle>Sources</CardTitle>
                  <CardDescription>
                    Open the supporting document and jump straight to the relevant section.
                  </CardDescription>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                  {selectedSources.length} source{selectedSources.length === 1 ? "" : "s"}
                </div>
              </div>

              {selectedSources.length === 0 ? (
                <EmptyState
                  eyebrow="No sources"
                  title="No sources were saved for this answer."
                  description="If the answer could not be completed or no relevant document sections were found, there may not be any sources to review."
                  actionLabel="Ask another question"
                  actionHref="/chat"
                  secondaryActionLabel="Browse documents"
                  secondaryActionHref="/documents"
                  icon={
                    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                      <path d="M7 3.75h7l5 5V20.25A1.75 1.75 0 0 1 17.25 22h-10.5A1.75 1.75 0 0 1 5 20.25V5.5A1.75 1.75 0 0 1 6.75 3.75Z" />
                      <path d="M14 3.75v5h5M8 12h8M8 16h5" />
                    </svg>
                  }
                />
              ) : (
                <div className="grid gap-4">
                  {selectedSources.map((source) => (
                    <div
                      key={source.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                                {source.source_label}
                              </span>
                              <p className="text-lg font-semibold text-white">
                                {source.document_title}
                              </p>
                              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-200">
                                Section {source.chunk_index + 1}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
                              <span>Saved with this answer</span>
                            </div>
                          </div>
                          <p className="text-sm leading-7 text-slate-300">
                            <MathText highlightQuery={selectedTurn.question}>
                              {getChunkPreview(source.content_excerpt)}
                            </MathText>
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col gap-3">
                          {source.document_id ? (
                            <Button
                              href={buildDocumentChunkUrl(source.document_id, source.chunk_index)}
                              variant="secondary"
                              className="justify-center"
                            >
                              View source section
                            </Button>
                          ) : (
                            <span className="rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-400">
                              Source file unavailable
                            </span>
                          )}
                          {source.document_id ? (
                            <Button href={`/documents/${source.document_id}`} variant="ghost">
                              Open document
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
