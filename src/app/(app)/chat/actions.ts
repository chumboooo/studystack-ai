"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateGroundedAnswer, type RetrievalChunk } from "@/lib/chat/grounded-answer";
import { retrieveMultiPartGroundingChunks } from "@/lib/chat/retrieve-grounding";
import { decomposeQueryParts } from "@/lib/retrieval/query-parts";
import { createClient } from "@/lib/supabase/server";

function buildChatRedirect(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();

  return query ? `/chat?${query}` : "/chat";
}

function buildQuestionTitle(question: string) {
  const trimmed = question.trim().replace(/\s+/g, " ");

  if (trimmed.length <= 72) {
    return trimmed;
  }

  return `${trimmed.slice(0, 69)}...`;
}

type ThreadContextTurn = {
  question: string;
  answer: string | null;
};

function getCompactAnswer(answer: string | null) {
  return (answer ?? "").replace(/\s+/g, " ").trim().slice(0, 600);
}

function buildThreadContext(turns: ThreadContextTurn[]) {
  return turns
    .slice()
    .reverse()
    .map((turn, index) => {
      const answer = getCompactAnswer(turn.answer);

      return `Turn ${index + 1}\nUser: ${turn.question}${answer ? `\nStudyStack: ${answer}` : ""}`;
    })
    .join("\n\n")
    .slice(0, 2200);
}

function shouldUseThreadContext(question: string) {
  const normalized = question.toLowerCase().trim();

  return (
    normalized.length <= 90 ||
    /\b(it|that|this|those|these|show me|explain that|solve it|next step|example|what formula|how do i|can you)\b/.test(
      normalized,
    )
  );
}

function buildRetrievalQuestion(question: string, threadContext: string) {
  if (!threadContext || !shouldUseThreadContext(question)) {
    return question;
  }

  return `Use this recent study-thread context to interpret the follow-up, then search for source material that answers the current question.\n\nRecent context:\n${threadContext}\n\nCurrent follow-up:\n${question}`;
}

async function requireChatUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return { supabase, user };
}

export async function submitGroundedQuestion(formData: FormData) {
  const { supabase, user } = await requireChatUser();

  const question = String(formData.get("question") ?? "").trim();
  const sessionId = String(formData.get("sessionId") ?? "").trim();

  if (!question) {
    redirect(
      buildChatRedirect({
        error: "Enter a question before asking StudyStack.",
        q: question,
      }),
    );
  }

  let activeSessionId = sessionId;

  if (activeSessionId) {
    const { data: existingSession, error: existingSessionError } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("id", activeSessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingSessionError || !existingSession) {
      redirect(
        buildChatRedirect({
          error: "That chat session could not be found for this account.",
          q: question,
        }),
      );
    }
  } else {
    const { data: newSession, error: sessionError } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: user.id,
        title: buildQuestionTitle(question),
      })
      .select("id")
      .single();

    if (sessionError || !newSession) {
      redirect(
        buildChatRedirect({
          error: "A new chat session could not be created.",
          q: question,
        }),
      );
    }

    activeSessionId = newSession.id;
  }

  let retrievedChunks: RetrievalChunk[];
  const { data: priorTurns } = activeSessionId
    ? await supabase
        .from("chat_turns")
        .select("question, answer")
        .eq("session_id", activeSessionId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3)
    : { data: [] };
  const threadContext = buildThreadContext(priorTurns ?? []);
  const retrievalQuestion = buildRetrievalQuestion(question, threadContext);
  const queryPlan = decomposeQueryParts(question);

  try {
    retrievedChunks = await retrieveMultiPartGroundingChunks({
      supabase,
      question: queryPlan.isMultiPart ? question : retrievalQuestion,
    });
  } catch {
    redirect(
      buildChatRedirect({
        session: activeSessionId,
        error: "StudyStack could not search your materials right now.",
        q: question,
      }),
    );
  }

  const noSourceAnswer =
    "StudyStack could not find a strong source in your materials for that question, so it did not generate an answer.";
  const answerResult =
    retrievedChunks.length > 0
      ? await generateGroundedAnswer({
          question,
          chunks: retrievedChunks,
          threadContext,
        })
      : null;

  const { data: turn, error: turnError } = await supabase
    .from("chat_turns")
    .insert({
      session_id: activeSessionId,
      user_id: user.id,
      question,
      answer:
        answerResult?.ok
          ? answerResult.answer
          : retrievedChunks.length === 0
            ? noSourceAnswer
            : "",
      status:
        retrievedChunks.length === 0
          ? "no_sources"
          : answerResult?.ok
            ? "completed"
            : "failed",
      error_message:
        retrievedChunks.length === 0 ? null : answerResult?.ok ? null : answerResult?.error ?? null,
    })
    .select("id")
    .single();

  if (turnError || !turn) {
    redirect(
      buildChatRedirect({
        session: activeSessionId,
        error: "The answer could not be saved.",
        q: question,
      }),
    );
  }

  const sourcesToSave = (answerResult?.usedChunks ?? retrievedChunks).map((chunk, index) => ({
    turn_id: turn.id,
    user_id: user.id,
    source_label: `S${index + 1}`,
    document_id: chunk.document_id,
    chunk_id: chunk.chunk_id,
    document_title: chunk.document_title,
    chunk_index: chunk.chunk_index,
    rank: chunk.rank,
    content_excerpt: chunk.content,
  }));

  if (sourcesToSave.length > 0) {
    const { error: sourceError } = await supabase.from("chat_turn_sources").insert(sourcesToSave);

    if (sourceError) {
      redirect(
        buildChatRedirect({
          session: activeSessionId,
          turn: turn.id,
          error: "The answer was saved, but its sources could not be saved.",
          q: question,
        }),
      );
    }
  }

  await supabase
    .from("chat_sessions")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", activeSessionId);

  revalidatePath("/chat");

  redirect(
    buildChatRedirect({
      session: activeSessionId,
      turn: turn.id,
      message:
        retrievedChunks.length === 0
          ? "Question saved without an answer because no strong source was found."
          : answerResult?.ok
            ? "Answer saved."
            : "Question saved, but the answer could not be completed.",
    }),
  );
}

export async function deleteChatSession(formData: FormData) {
  const { supabase, user } = await requireChatUser();

  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const returnSessionId = String(formData.get("returnSessionId") ?? "").trim();
  const returnTurnId = String(formData.get("returnTurnId") ?? "").trim();

  if (!sessionId) {
    redirect(
      buildChatRedirect({
        error: "Choose a conversation to delete.",
        ...(returnSessionId ? { session: returnSessionId } : {}),
        ...(returnTurnId ? { turn: returnTurnId } : {}),
      }),
    );
  }

  const { data: existingSession, error: sessionError } = await supabase
    .from("chat_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sessionError || !existingSession) {
    redirect(
      buildChatRedirect({
        error: "That conversation could not be found for this account.",
        ...(returnSessionId ? { session: returnSessionId } : {}),
        ...(returnTurnId ? { turn: returnTurnId } : {}),
      }),
    );
  }

  const { error: deleteError } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (deleteError) {
    redirect(
      buildChatRedirect({
        error: "That conversation could not be deleted.",
        ...(returnSessionId && returnSessionId !== sessionId ? { session: returnSessionId } : {}),
        ...(returnTurnId && returnSessionId !== sessionId ? { turn: returnTurnId } : {}),
      }),
    );
  }

  revalidatePath("/chat");

  const shouldResetView = !returnSessionId || returnSessionId === sessionId;

  redirect(
    buildChatRedirect({
      message: "Conversation deleted.",
      ...(shouldResetView ? {} : { session: returnSessionId }),
      ...(shouldResetView || !returnTurnId ? {} : { turn: returnTurnId }),
    }),
  );
}

export async function deleteChatTurn(formData: FormData) {
  const { supabase, user } = await requireChatUser();

  const turnId = String(formData.get("turnId") ?? "").trim();
  const returnSessionId = String(formData.get("returnSessionId") ?? "").trim();
  const returnTurnId = String(formData.get("returnTurnId") ?? "").trim();

  if (!turnId) {
    redirect(
      buildChatRedirect({
        error: "Choose a saved question to delete.",
        ...(returnSessionId ? { session: returnSessionId } : {}),
        ...(returnTurnId ? { turn: returnTurnId } : {}),
      }),
    );
  }

  const { data: existingTurn, error: turnLookupError } = await supabase
    .from("chat_turns")
    .select("id, session_id")
    .eq("id", turnId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (turnLookupError || !existingTurn) {
    redirect(
      buildChatRedirect({
        error: "That saved question could not be found for this account.",
        ...(returnSessionId ? { session: returnSessionId } : {}),
        ...(returnTurnId ? { turn: returnTurnId } : {}),
      }),
    );
  }

  const deletedSessionId = existingTurn.session_id;

  const { error: deleteError } = await supabase
    .from("chat_turns")
    .delete()
    .eq("id", turnId)
    .eq("user_id", user.id);

  if (deleteError) {
    redirect(
      buildChatRedirect({
        error: "That saved question could not be deleted.",
        ...(returnSessionId ? { session: returnSessionId } : {}),
        ...(returnTurnId ? { turn: returnTurnId } : {}),
      }),
    );
  }

  const { count: remainingTurnCount } = await supabase
    .from("chat_turns")
    .select("*", { count: "exact", head: true })
    .eq("session_id", deletedSessionId)
    .eq("user_id", user.id);

  if ((remainingTurnCount ?? 0) === 0) {
    await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", deletedSessionId)
      .eq("user_id", user.id);
  }

  revalidatePath("/chat");

  const deletedCurrentTurn = returnTurnId === turnId;
  const deletedCurrentSession = !returnSessionId || returnSessionId === deletedSessionId;

  if (!deletedCurrentTurn) {
    redirect(
      buildChatRedirect({
        message: "Saved question deleted.",
        ...(returnSessionId ? { session: returnSessionId } : {}),
        ...(returnTurnId ? { turn: returnTurnId } : {}),
      }),
    );
  }

  const { data: replacementTurn } =
    deletedCurrentSession && (remainingTurnCount ?? 0) > 0
      ? await supabase
          .from("chat_turns")
          .select("id, session_id")
          .eq("session_id", deletedSessionId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null };

  if (replacementTurn) {
    redirect(
      buildChatRedirect({
        session: replacementTurn.session_id,
        turn: replacementTurn.id,
        message: "Saved question deleted.",
      }),
    );
  }

  redirect(
    buildChatRedirect({
      message: "Saved question deleted.",
    }),
  );
}
