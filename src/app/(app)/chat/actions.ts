"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateGroundedAnswer, type RetrievalChunk } from "@/lib/chat/grounded-answer";
import { retrieveGroundingChunks } from "@/lib/chat/retrieve-grounding";
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

export async function submitGroundedQuestion(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

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
          error: sessionError?.message ?? "A new chat session could not be created.",
          q: question,
        }),
      );
    }

    activeSessionId = newSession.id;
  }

  let retrievedChunks: RetrievalChunk[];

  try {
    retrievedChunks = await retrieveGroundingChunks({
      supabase,
      question,
    });
  } catch (error) {
    redirect(
      buildChatRedirect({
        session: activeSessionId,
        error: error instanceof Error ? error.message : String(error),
        q: question,
      }),
    );
  }

  const noSourceAnswer =
    "StudyStack could not find useful source chunks for that question, so it did not generate a grounded answer.";
  const answerResult =
    retrievedChunks.length > 0
      ? await generateGroundedAnswer({
          question,
          chunks: retrievedChunks,
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
        error: turnError?.message ?? "The grounded answer could not be saved.",
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
          error: sourceError.message,
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
          ? "Question saved with a no-sources result."
          : answerResult?.ok
            ? "Grounded answer saved."
            : "Question saved, but answer generation failed.",
    }),
  );
}
