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

function parseManualQuestionIds(formData: FormData) {
  return String(formData.get("questionIds") ?? "")
    .split(",")
    .map((id) => Number.parseInt(id, 10))
    .filter(Number.isFinite);
}

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
  } catch {
    redirect(
      buildStudyToolRedirect("quizzes", {
        error: "StudyStack could not find enough useful material for a quiz.",
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
      studyTopic: retrievalQuery,
      questionCount: requestedCount,
    });
  } catch {
    redirect(
      buildStudyToolRedirect("quizzes", {
        error: "The quiz could not be generated right now.",
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
    await supabase.from("quiz_questions").delete().eq("set_id", targetSetId).eq("user_id", user.id);
    await supabase
      .from("quiz_sets")
      .update({
        title: title || source.titleHint,
        source_mode: source.sourceMode,
        query_text: source.sourceMode === "retrieval" ? retrievalQuery : null,
        document_id: source.documentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetSetId)
      .eq("user_id", user.id);
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
        error: "The quiz could not be saved.",
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
    `/quizzes/${targetSetId}?${new URLSearchParams({
      message: `${replaceExisting ? "Quiz regenerated." : "Quiz generated."}${partialMessage}`,
    }).toString()}`,
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

export async function createManualQuizSet(formData: FormData) {
  const { supabase, user } = await requireStudyToolUser();
  const title = String(formData.get("title") ?? "").trim();
  const questionIds = parseManualQuestionIds(formData);
  const questions = questionIds
    .map((id) => {
      const choices = [0, 1, 2, 3].map((choiceIndex) =>
        String(formData.get(`choice-${id}-${choiceIndex}`) ?? "").trim(),
      );

      return {
        question: String(formData.get(`question-${id}`) ?? "").trim(),
        choices,
        correctChoiceIndex: Number.parseInt(String(formData.get(`correct-${id}`) ?? ""), 10),
        explanation:
          String(formData.get(`explanation-${id}`) ?? "").trim() ||
          "Review the correct answer and try the question again later.",
      };
    })
    .filter(
      (question) =>
        question.question.length > 0 &&
        question.choices.every((choice) => choice.length > 0) &&
        Number.isInteger(question.correctChoiceIndex) &&
        question.correctChoiceIndex >= 0 &&
        question.correctChoiceIndex <= 3,
    );

  if (!title || questions.length === 0) {
    redirect(
      buildStudyToolRedirect("quizzes", {
        error: "Add a title and at least one complete multiple-choice question.",
      }),
    );
  }

  const { data: set, error: setError } = await supabase
    .from("quiz_sets")
    .insert({
      user_id: user.id,
      title,
      source_mode: "manual",
      query_text: null,
      document_id: null,
    })
    .select("id")
    .single();

  if (setError || !set) {
    redirect(
      buildStudyToolRedirect("quizzes", {
        error: "The manual quiz could not be created.",
      }),
    );
  }

  const { error: questionError } = await supabase.from("quiz_questions").insert(
    questions.map((question) => ({
      set_id: set.id,
      user_id: user.id,
      question: question.question,
      choices: question.choices,
      correct_choice_index: question.correctChoiceIndex,
      explanation: question.explanation,
      source_document_id: null,
      source_document_title: null,
      source_chunk_id: null,
      source_chunk_index: null,
    })),
  );

  if (questionError) {
    redirect(
      buildStudyToolRedirect("quizzes", {
        error: "The manual quiz questions could not be saved.",
      }),
    );
  }

  revalidatePath("/quizzes");
  redirect(
    `/quizzes/${set.id}?${new URLSearchParams({
      message: "Manual quiz saved.",
    }).toString()}`,
  );
}

export async function regenerateQuizSet(formData: FormData) {
  const { supabase, user } = await requireStudyToolUser();
  const setId = String(formData.get("setId") ?? "").trim();

  if (!setId) {
    redirect(buildStudyToolRedirect("quizzes", { error: "A quiz set id is required." }));
  }

  const { data: set, error } = await supabase
    .from("quiz_sets")
    .select("id, title, source_mode, query_text, document_id")
    .eq("id", setId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !set) {
    redirect(
      buildStudyToolRedirect("quizzes", {
        error: "That quiz set could not be found.",
      }),
    );
  }

  if (set.source_mode === "manual") {
    redirect(
      buildStudyToolRedirect("quizzes", {
        error: "Manual quizzes cannot be regenerated automatically.",
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
  const { supabase, user } = await requireStudyToolUser();
  const setId = String(formData.get("setId") ?? "").trim();

  if (!setId) {
    redirect(buildStudyToolRedirect("quizzes", { error: "A quiz set id is required." }));
  }

  const { error } = await supabase
    .from("quiz_sets")
    .delete()
    .eq("id", setId)
    .eq("user_id", user.id);

  if (error) {
    redirect(buildStudyToolRedirect("quizzes", { error: "That quiz could not be deleted." }));
  }

  revalidatePath("/quizzes");
  redirect(buildStudyToolRedirect("quizzes", { message: "Quiz deleted." }));
}
