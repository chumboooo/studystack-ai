import { deleteChatSession, deleteChatTurn, submitGroundedQuestion } from "@/app/(app)/chat/actions";
import { AskQuestionButton } from "@/components/chat/ask-question-button";
import { ChatAttachmentUpload } from "@/components/chat/chat-attachment-upload";
import { DeleteChatSessionForm, DeleteChatTurnForm } from "@/components/chat/delete-chat-form";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/ui/math-text";
import { buildDocumentChunkUrl, formatDocumentDate } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

type ChatPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    q?: string;
    new?: string;
    session?: string;
    turn?: string;
  }>;
};

const suggestedPrompts = [
  "Explain the difference between mitosis and meiosis.",
  "What are the outputs of glycolysis?",
  "How does supply and demand reach equilibrium?",
];

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

  return "No strong match";
}

function getChunkPreview(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (normalized.length <= 280) {
    return normalized;
  }

  return `${normalized.slice(0, 277)}...`;
}

function formatAnswerForDisplay(content: string) {
  return content
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const [{ error: pageError, message, q, new: newThread, session, turn }, supabase] = await Promise.all([
    searchParams,
    createClient(),
  ]);
  const draftQuestion = q?.trim() ?? "";
  const startsFreshThread = newThread === "1";
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uploadBucket = process.env.SUPABASE_DOCUMENTS_BUCKET || "documents";

  const { data: sessionsData, error: sessionsError } = await supabase
    .from("chat_sessions")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(10);

  const sessions = sessionsData ?? [];

  let selectedTurn =
    !startsFreshThread && turn && turn.trim().length > 0
      ? (
          await supabase
            .from("chat_turns")
            .select("id, session_id, question, answer, status, error_message, created_at")
            .eq("id", turn)
            .maybeSingle()
        ).data
      : null;

  const activeSessionId =
    startsFreshThread
      ? null
      : selectedTurn?.session_id ??
        (session && session.trim().length > 0 ? session : sessions[0]?.id ?? null);

  const { data: activeSessionTurnsData, error: sessionTurnsError } = activeSessionId
    ? await supabase
        .from("chat_turns")
        .select("id, session_id, question, answer, status, error_message, created_at")
        .eq("session_id", activeSessionId)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  const activeSessionTurns = activeSessionTurnsData ?? [];

  if (!selectedTurn && activeSessionTurns.length > 0) {
    selectedTurn = activeSessionTurns[activeSessionTurns.length - 1];
  }

  const activeTurnIds = activeSessionTurns.map((sessionTurn) => sessionTurn.id);
  const { data: activeSourcesData, error: activeSourcesError } = activeTurnIds.length > 0
    ? await supabase
        .from("chat_turn_sources")
        .select(
          "id, turn_id, source_label, document_id, chunk_id, document_title, chunk_index, rank, content_excerpt, created_at",
        )
        .in("turn_id", activeTurnIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  const sourcesByTurnId = new Map<string, NonNullable<typeof activeSourcesData>>();
  for (const source of activeSourcesData ?? []) {
    sourcesByTurnId.set(source.turn_id, [...(sourcesByTurnId.get(source.turn_id) ?? []), source]);
  }
  const activeSession = sessions.find((entry) => entry.id === activeSessionId) ?? null;
  const hasDataError = sessionTurnsError || activeSourcesError || sessionsError;

  return (
    <div className="space-y-6">
      <section className="surface-enter rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.26)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Study chat
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Ask your notes anything.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Get answers based on your uploaded materials, then open the exact source sections when you want to review.
            </p>
          </div>
        </div>
      </section>

      {pageError ? <AlertBanner tone="error">{pageError}</AlertBanner> : null}
      {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}
      {hasDataError ? (
        <AlertBanner tone="error">
          Your chat history could not be loaded right now. Please refresh and try again.
        </AlertBanner>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <main className="surface-enter min-h-[42rem] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/45 shadow-[0_24px_80px_rgba(2,6,23,0.2)]">
          <div className="border-b border-white/10 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {activeSession?.title ?? "New study conversation"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {activeSessionTurns.length > 0
                    ? `${activeSessionTurns.length} saved question${activeSessionTurns.length === 1 ? "" : "s"}`
                    : "Ask a question to start a saved conversation."}
                </p>
              </div>
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
          </div>

          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl space-y-7">
              {activeSessionTurns.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm font-semibold text-white">Start a study conversation.</p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                    Attach a PDF with the plus button or ask about materials already in your library.
                  </p>
                </div>
              ) : (
                activeSessionTurns.map((sessionTurn) => {
                  const turnSources = sourcesByTurnId.get(sessionTurn.id) ?? [];

                  return (
                    <div key={sessionTurn.id} className="chat-message space-y-4">
                      <div className="flex justify-end">
                        <div className="max-w-[48rem] rounded-[1.6rem] bg-cyan-300 px-5 py-4 text-sm leading-7 text-slate-950 shadow-[0_16px_46px_rgba(34,211,238,0.16)]">
                          <MathText>{sessionTurn.question}</MathText>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="mt-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-xs font-semibold text-cyan-200 sm:flex">
                          S
                        </div>
                        <div className="min-w-0 flex-1 space-y-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusTone(sessionTurn.status)}`}>
                              {getStatusLabel(sessionTurn.status)}
                            </span>
                            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
                              {formatDocumentDate(sessionTurn.created_at)}
                            </span>
                          </div>

                          {sessionTurn.status === "completed" ? (
                            <div className="prose-answer rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 text-sm leading-8 text-slate-100 sm:p-6">
                              <MathText>{formatAnswerForDisplay(sessionTurn.answer ?? "")}</MathText>
                            </div>
                          ) : sessionTurn.status === "no_sources" ? (
                            <AlertBanner tone="info">{sessionTurn.answer}</AlertBanner>
                          ) : (
                            <AlertBanner tone="error">
                              {sessionTurn.error_message ||
                                "This answer could not be generated, but the question was still saved."}
                            </AlertBanner>
                          )}

                          <details className="group rounded-[1.4rem] border border-white/10 bg-slate-900/40 p-4 open:bg-slate-900/70">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-white">
                              <span>Sources</span>
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                                {turnSources.length} source{turnSources.length === 1 ? "" : "s"}
                              </span>
                            </summary>

                            {turnSources.length === 0 ? (
                              <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-6 text-slate-400">
                                No source sections were saved for this answer.
                              </p>
                            ) : (
                              <div className="mt-4 grid gap-3 border-t border-white/10 pt-4">
                                {turnSources.map((source) => (
                                  <div
                                    key={source.id}
                                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 soft-hover"
                                  >
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                      <div className="min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="rounded-full border border-white/10 bg-slate-950/60 px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-slate-300">
                                            {source.source_label}
                                          </span>
                                          <p className="font-semibold text-white">{source.document_title}</p>
                                          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-cyan-200">
                                            Section {source.chunk_index + 1}
                                          </span>
                                        </div>
                                        <p className="text-sm leading-7 text-slate-300">
                                          <MathText highlightQuery={sessionTurn.question}>
                                            {getChunkPreview(source.content_excerpt)}
                                          </MathText>
                                        </p>
                                      </div>
                                      <div className="flex shrink-0 flex-wrap gap-2">
                                        {source.document_id ? (
                                          <Button
                                            href={buildDocumentChunkUrl(source.document_id, source.chunk_index)}
                                            variant="secondary"
                                          >
                                            View source
                                          </Button>
                                        ) : null}
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
                          </details>

                          <DeleteChatTurnForm
                            action={deleteChatTurn}
                            turnId={sessionTurn.id}
                            returnSessionId={activeSessionId ?? undefined}
                            returnTurnId={selectedTurn?.id}
                            confirmMessage="Delete this question and answer? This cannot be undone."
                            label="Delete answer"
                            pendingLabel="Deleting..."
                            className="border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs text-rose-100 hover:bg-rose-400/20"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="border-t border-white/10 bg-slate-950/70 p-4 sm:p-5">
            <form action={submitGroundedQuestion} className="mx-auto flex max-w-4xl flex-col gap-3">
              {activeSessionId ? <input type="hidden" name="sessionId" value={activeSessionId} /> : null}
              <label className="sr-only" htmlFor="chat-question">
                Ask a question
              </label>
              <div className="flex flex-col gap-3 rounded-[1.6rem] border border-white/10 bg-white/[0.06] p-2 focus-within:border-cyan-300/40 sm:flex-row sm:items-center">
                {user ? <ChatAttachmentUpload userId={user.id} bucket={uploadBucket} /> : null}
                <input
                  id="chat-question"
                  name="question"
                  defaultValue={draftQuestion}
                  type="text"
                  placeholder="Ask about a formula, concept, reading, or example..."
                  className="min-h-12 flex-1 rounded-full bg-transparent px-4 text-sm text-white outline-none placeholder:text-slate-500"
                />
                <AskQuestionButton />
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt) => (
                  <a
                    key={prompt}
                    href={`/chat?q=${encodeURIComponent(prompt)}`}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-cyan-300/25 hover:text-cyan-100"
                  >
                    {prompt}
                  </a>
                ))}
              </div>
            </form>
          </div>
        </main>

        <aside className="surface-enter space-y-4">
          <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Conversations</p>
                <p className="mt-1 text-xs text-slate-500">Reopen a thread and keep studying.</p>
              </div>
              <Button href="/chat?new=1" variant="ghost">
                New thread
              </Button>
            </div>
            <div className="mt-4 grid gap-2">
              {sessions.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm leading-6 text-slate-400">
                  Conversations will appear here after the first question.
                </p>
              ) : (
                sessions.map((chatSession) => (
                  <a
                    key={chatSession.id}
                    href={`/chat?session=${chatSession.id}`}
                    className={`rounded-2xl border px-3 py-3 text-sm leading-6 transition-colors ${
                      activeSessionId === chatSession.id
                        ? "border-cyan-300/30 bg-cyan-300/10 text-white"
                        : "border-white/10 bg-slate-950/35 text-slate-300 hover:border-cyan-300/20 hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="line-clamp-2 font-medium">
                      <MathText>{chatSession.title}</MathText>
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Updated {formatDocumentDate(chatSession.updated_at)}
                    </span>
                  </a>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Current thread</p>
                <p className="mt-1 text-xs text-slate-500">Questions grouped in this conversation.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                {activeSessionTurns.length}
              </span>
            </div>

            {activeSessionTurns.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm leading-6 text-slate-400">
                Ask a question to start this thread.
              </p>
            ) : (
              <div className="mt-4 grid gap-2">
                {activeSessionTurns.map((threadTurn) => (
                  <a
                    key={threadTurn.id}
                    href={`/chat?session=${threadTurn.session_id}&turn=${threadTurn.id}`}
                    className={`rounded-2xl border p-3 transition-colors ${
                      selectedTurn?.id === threadTurn.id
                        ? "border-cyan-300/30 bg-cyan-300/10"
                        : "border-white/10 bg-slate-950/35"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[0.68rem] ${getStatusTone(threadTurn.status)}`}>
                        {getStatusLabel(threadTurn.status)}
                      </span>
                      <span className="text-[0.68rem] uppercase tracking-[0.14em] text-slate-500">
                        {formatDocumentDate(threadTurn.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-white">
                      <MathText>{threadTurn.question}</MathText>
                    </p>
                  </a>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
