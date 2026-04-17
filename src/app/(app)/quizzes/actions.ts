"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildPartialGenerationMessage,
  buildStudyToolRedirect,
  clampRequestedStudyItemCount,
  parseRequestedStudyItemCount,
  requireStudyToolUser,
} from "@/lib/study-tools/action-helpers";
import { generateQuizFromChunks } from "@/lib/study-tools/generate";
import { retrieveStudyChunks } from "@/lib/study-tools/retrieval";

type RetrievedSource = Awaited<ReturnType<typeof retrieveStudyChunks>>;
type GeneratedQuestions = Awaited<ReturnType<typeof generateQuizFromChunks>>;

async function generateAndStoreQuiz({
  setId,
  title,
  queryText,
  documentId,
  requestedCount,
  replaceExisting,
}: {
  setId?: string;
  title: string;
  queryText: string;
  documentId: string;
  requestedCount: number;
  replaceExisting?: boolean;
}) {
  const { supabase, user } = await requireStudyToolUser();
  let source: RetrievedSource;
  const retrievalQuery = queryText.trim() || title.trim();

  try {
    source = await retrieveStudyChunks({
      supabase,
      queryText: retrievalQuery,
      documentId,
      matchCount: 8,
    });
  } catch (error) {
    redirect(
      buildStudyToolRedirect("quizzes", {
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  if (source.chunks.length === 0) {
    redirect(
      buildStudyToolRedirect("quizzes", {
        error: "StudyStack could not find enough useful material for a quiz.",
      }),
    );
  }

  let questions: GeneratedQuestions;

  try {
    questions = await generateQuizFromChunks({
      chunks: source.chunks,
      titleHint: title || source.titleHint,
      questionCount: requestedCount,
    });
  } catch (error) {
    redirect(
      buildStudyToolRedirect("quizzes", {
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  if (questions.items.length === 0) {
    redirect(
      buildStudyToolRedirect("quizzes", {
        error: "The model did not return any usable quiz questions.",
      }),
    );
  }

  const targetSetId =
    setId ||
    (
      await supabase
        .from("quiz_sets")
        .insert({
          user_id: user.id,
          title: title || source.titleHint,
          source_mode: source.sourceMode,
          query_text: source.sourceMode === "retrieval" ? retrievalQuery : null,
          document_id: source.documentId,
        })
        .select("id")
        .single()
    ).data?.id;

  if (!targetSetId) {
    redirect(
      buildStudyToolRedirect("quizzes", {
        error: "The quiz set could not be created.",
      }),
    );
  }

  if (replaceExisting) {
    await supabase.from("quiz_questions").delete().eq("set_id", targetSetId);
    await supabase
      .from("quiz_sets")
      .update({
        title: title || source.titleHint,
        source_mode: source.sourceMode,
        query_text: source.sourceMode === "retrieval" ? retrievalQuery : null,
        document_id: source.documentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetSetId);
  }

  const { error: insertError } = await supabase.from("quiz_questions").insert(
    questions.items.map((question) => ({
      set_id: targetSetId,
      user_id: user.id,
      question: question.question,
      choices: question.choices,
      correct_choice_index: question.correctChoiceIndex,
      explanation: question.explanation,
      source_document_id: question.sourceChunk.document_id,
      source_document_title: question.sourceChunk.document_title,
      source_chunk_id: question.sourceChunk.chunk_id,
      source_chunk_index: question.sourceChunk.chunk_index,
    })),
  );

  if (insertError) {
    redirect(
      buildStudyToolRedirect("quizzes", {
        error: insertError.message,
      }),
    );
  }

  revalidatePath("/quizzes");

  const partialMessage = buildPartialGenerationMessage({
    actualCount: questions.items.length,
    requestedCount: questions.requestedCount,
    tool: "quizzes",
  });

  redirect(
    buildStudyToolRedirect("quizzes", {
      set: targetSetId,
      message: `${replaceExisting ? "Quiz regenerated." : "Quiz generated."}${partialMessage}`,
    }),
  );
}

export async function generateQuizSet(formData: FormData) {
  await generateAndStoreQuiz({
    title: String(formData.get("title") ?? "").trim(),
    queryText: String(formData.get("topic") ?? "").trim(),
    documentId: String(formData.get("documentId") ?? "").trim(),
    requestedCount: parseRequestedStudyItemCount("quizzes", formData.get("count")),
  });
}

export async function regenerateQuizSet(formData: FormData) {
  const { supabase } = await requireStudyToolUser();
  const setId = String(formData.get("setId") ?? "").trim();

  if (!setId) {
    redirect(buildStudyToolRedirect("quizzes", { error: "A quiz set id is required." }));
  }

  const { data: set, error } = await supabase
    .from("quiz_sets")
    .select("id, title, query_text, document_id")
    .eq("id", setId)
    .maybeSingle();

  if (error || !set) {
    redirect(
      buildStudyToolRedirect("quizzes", {
        error: error?.message ?? "That quiz set could not be found.",
      }),
    );
  }

  const { count } = await supabase
    .from("quiz_questions")
    .select("*", { count: "exact", head: true })
    .eq("set_id", setId);

  await generateAndStoreQuiz({
    setId: set.id,
    title: set.title,
    queryText: set.query_text ?? "",
    documentId: set.document_id ?? "",
    requestedCount: clampRequestedStudyItemCount("quizzes", count),
    replaceExisting: true,
  });
}

export async function deleteQuizSet(formData: FormData) {
  const { supabase } = await requireStudyToolUser();
  const setId = String(formData.get("setId") ?? "").trim();

  if (!setId) {
    redirect(buildStudyToolRedirect("quizzes", { error: "A quiz set id is required." }));
  }

  const { error } = await supabase.from("quiz_sets").delete().eq("id", setId);

  if (error) {
    redirect(buildStudyToolRedirect("quizzes", { error: error.message }));
  }

  revalidatePath("/quizzes");
  redirect(buildStudyToolRedirect("quizzes", { message: "Quiz deleted." }));
}
