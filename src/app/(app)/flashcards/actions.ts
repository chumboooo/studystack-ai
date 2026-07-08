"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isDemoSession } from "@/lib/demo/mode";
import {
  buildPartialGenerationMessage,
  buildStudyToolRedirect,
  clampRequestedStudyItemCount,
  parseRequestedStudyItemCount,
  requireStudyToolUser,
} from "@/lib/study-tools/action-helpers";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { logServerEvent } from "@/lib/server/logger";
import { generateFlashcardsFromChunks } from "@/lib/study-tools/generate";
import { retrieveStudyChunks } from "@/lib/study-tools/retrieval";
import { validateOptionalTopic, validateStudySetTitle } from "@/lib/validation";

type RetrievedSource = Awaited<ReturnType<typeof retrieveStudyChunks>>;
type GeneratedCards = Awaited<ReturnType<typeof generateFlashcardsFromChunks>>;

function parseManualCardIds(formData: FormData) {
  return String(formData.get("cardIds") ?? "")
    .split(",")
    .map((id) => Number.parseInt(id, 10))
    .filter(Number.isFinite);
}

function parseManualCards(formData: FormData) {
  return parseManualCardIds(formData)
    .map((id) => ({
      prompt: String(formData.get(`front-${id}`) ?? "").trim(),
      answer: String(formData.get(`back-${id}`) ?? "").trim(),
    }))
    .filter((card) => card.prompt.length > 0 && card.answer.length > 0);
}

async function generateAndStoreFlashcards({
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
  const normalizedTitle = validateStudySetTitle(title, "flashcards");
  const safeTitle = normalizedTitle.ok ? normalizedTitle.value : title.trim().slice(0, 140);
  const retrievalQuery = validateOptionalTopic(queryText) || safeTitle;
  const generationRateLimit = checkRateLimit({
    action: replaceExisting ? "flashcards-regenerate" : "flashcards-generate",
    identifier: user.id,
    limit: 6,
    windowMs: 10 * 60 * 1000,
  });

  if (!generationRateLimit.ok) {
    redirect(
      buildStudyToolRedirect("flashcards", {
        error: `Too many flashcard requests were made in a short time. Please wait about ${generationRateLimit.retryAfterSeconds} seconds and try again.`,
      }),
    );
  }

  try {
    source = await retrieveStudyChunks({
      supabase,
      queryText: retrievalQuery,
      documentId,
      matchCount: 8,
    });
  } catch (error) {
    logServerEvent("warn", "flashcards.retrieve_failed", {
      userId: user.id,
      documentId: documentId || "all",
      error: error instanceof Error ? error.message : "unknown_error",
    });
    redirect(
      buildStudyToolRedirect("flashcards", {
        error: "StudyStack could not find enough useful material for flashcards.",
      }),
    );
  }

  if (source.chunks.length === 0) {
    redirect(
      buildStudyToolRedirect("flashcards", {
        error: "StudyStack could not find enough useful material for flashcards.",
      }),
    );
  }

  let cards: GeneratedCards;

  try {
    cards = await generateFlashcardsFromChunks({
      chunks: source.chunks,
      titleHint: safeTitle || source.titleHint,
      studyTopic: retrievalQuery,
      cardCount: requestedCount,
    });
  } catch (error) {
    logServerEvent("error", "flashcards.generate_failed", {
      userId: user.id,
      documentId: documentId || "all",
      error: error instanceof Error ? error.message : "unknown_error",
    });
    redirect(
      buildStudyToolRedirect("flashcards", {
        error: "Flashcards could not be generated right now.",
      }),
    );
  }

  if (cards.items.length === 0) {
    redirect(
      buildStudyToolRedirect("flashcards", {
        error: "The model did not return any usable flashcards.",
      }),
    );
  }

  const targetSetId =
    setId ||
    (
      await supabase
        .from("flashcard_sets")
        .insert({
          user_id: user.id,
          title: safeTitle || source.titleHint,
          source_mode: source.sourceMode,
          query_text: source.sourceMode === "retrieval" ? retrievalQuery : null,
          document_id: source.documentId,
        })
        .select("id")
        .single()
    ).data?.id;

  if (!targetSetId) {
    redirect(
      buildStudyToolRedirect("flashcards", {
        error: "The flashcard set could not be created.",
      }),
    );
  }

  if (replaceExisting) {
    await supabase.from("flashcards").delete().eq("set_id", targetSetId).eq("user_id", user.id);
    await supabase
      .from("flashcard_sets")
      .update({
        title: safeTitle || source.titleHint,
        source_mode: source.sourceMode,
        query_text: source.sourceMode === "retrieval" ? retrievalQuery : null,
        document_id: source.documentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetSetId)
      .eq("user_id", user.id);
  }

  const { error: insertError } = await supabase.from("flashcards").insert(
    cards.items.map((card) => ({
      set_id: targetSetId,
      user_id: user.id,
      prompt: card.front,
      answer: card.back,
      source_document_id: card.sourceChunk.document_id,
      source_document_title: card.sourceChunk.document_title,
      source_chunk_id: card.sourceChunk.chunk_id,
      source_chunk_index: card.sourceChunk.chunk_index,
    })),
  );

  if (insertError) {
    redirect(
      buildStudyToolRedirect("flashcards", {
        error: "The flashcards could not be saved.",
      }),
    );
  }

  revalidatePath("/flashcards");

  const partialMessage = buildPartialGenerationMessage({
    actualCount: cards.items.length,
    requestedCount: cards.requestedCount,
    tool: "flashcards",
  });

  redirect(
    `/flashcards/${targetSetId}?${new URLSearchParams({
      message: `${replaceExisting ? "Flashcards regenerated." : "Flashcards generated."}${partialMessage}`,
    }).toString()}`,
  );
}

export async function generateFlashcardSet(formData: FormData) {
  if (await isDemoSession()) {
    redirect(buildStudyToolRedirect("flashcards", { message: "Demo flashcard sets are seeded locally and generation is disabled." }));
  }

  await generateAndStoreFlashcards({
    title: String(formData.get("title") ?? ""),
    queryText: String(formData.get("topic") ?? ""),
    documentId: String(formData.get("documentId") ?? "").trim(),
    requestedCount: parseRequestedStudyItemCount("flashcards", formData.get("count")),
  });
}

export async function createManualFlashcardSet(formData: FormData) {
  if (await isDemoSession()) {
    redirect(buildStudyToolRedirect("flashcards", { message: "Manual flashcard creation is disabled in demo mode." }));
  }

  const { supabase, user } = await requireStudyToolUser();
  const titleValidation = validateStudySetTitle(String(formData.get("title") ?? ""), "flashcards");
  const cards = parseManualCards(formData);

  if (!titleValidation.ok || cards.length === 0) {
    redirect(
      buildStudyToolRedirect("flashcards", {
        error: titleValidation.ok ? "Add at least one complete flashcard." : titleValidation.error,
      }),
    );
  }

  const { data: set, error: setError } = await supabase
    .from("flashcard_sets")
    .insert({
      user_id: user.id,
      title: titleValidation.value,
      source_mode: "manual",
      query_text: null,
      document_id: null,
    })
    .select("id")
    .single();

  if (setError || !set) {
    redirect(
      buildStudyToolRedirect("flashcards", {
        error: "The manual flashcard set could not be created.",
      }),
    );
  }

  const { error: cardError } = await supabase.from("flashcards").insert(
    cards.map((card) => ({
      set_id: set.id,
      user_id: user.id,
      prompt: card.prompt,
      answer: card.answer,
      source_document_id: null,
      source_document_title: null,
      source_chunk_id: null,
      source_chunk_index: null,
    })),
  );

  if (cardError) {
    redirect(
      buildStudyToolRedirect("flashcards", {
        error: "The manual flashcards could not be saved.",
      }),
    );
  }

  revalidatePath("/flashcards");
  redirect(
    `/flashcards/${set.id}?${new URLSearchParams({
      message: "Manual flashcards saved.",
    }).toString()}`,
  );
}

export async function updateManualFlashcardSet(formData: FormData) {
  if (await isDemoSession()) {
    redirect(buildStudyToolRedirect("flashcards", { message: "Manual flashcard editing is disabled in demo mode." }));
  }

  const { supabase, user } = await requireStudyToolUser();
  const setId = String(formData.get("setId") ?? "").trim();
  const titleValidation = validateStudySetTitle(String(formData.get("title") ?? ""), "flashcards");
  const cards = parseManualCards(formData);

  if (!setId) {
    redirect(buildStudyToolRedirect("flashcards", { error: "A flashcard set id is required." }));
  }

  if (!titleValidation.ok || cards.length === 0) {
    redirect(`/flashcards/${setId}?${new URLSearchParams({ error: titleValidation.ok ? "Add at least one complete flashcard." : titleValidation.error }).toString()}`);
  }

  const { data: set, error: setError } = await supabase
    .from("flashcard_sets")
    .select("id, source_mode")
    .eq("id", setId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (setError || !set) {
    redirect(buildStudyToolRedirect("flashcards", { error: "That flashcard set could not be found." }));
  }

  if (set.source_mode !== "manual") {
    redirect(`/flashcards/${setId}?${new URLSearchParams({ error: "Only manual flashcard sets can be edited directly." }).toString()}`);
  }

  await supabase.from("flashcards").delete().eq("set_id", setId).eq("user_id", user.id);

  const { error: updateSetError } = await supabase
    .from("flashcard_sets")
    .update({
      title: titleValidation.value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", setId)
    .eq("user_id", user.id);

  if (updateSetError) {
    redirect(`/flashcards/${setId}?${new URLSearchParams({ error: "The flashcard set could not be updated." }).toString()}`);
  }

  const { error: cardError } = await supabase.from("flashcards").insert(
    cards.map((card) => ({
      set_id: setId,
      user_id: user.id,
      prompt: card.prompt,
      answer: card.answer,
      source_document_id: null,
      source_document_title: null,
      source_chunk_id: null,
      source_chunk_index: null,
    })),
  );

  if (cardError) {
    redirect(`/flashcards/${setId}?${new URLSearchParams({ error: "The manual flashcards could not be updated." }).toString()}`);
  }

  revalidatePath("/flashcards");
  revalidatePath(`/flashcards/${setId}`);
  redirect(`/flashcards/${setId}?${new URLSearchParams({ message: "Manual flashcard set updated." }).toString()}`);
}

export async function regenerateFlashcardSet(formData: FormData) {
  if (await isDemoSession()) {
    redirect(buildStudyToolRedirect("flashcards", { message: "Flashcard regeneration is disabled in demo mode." }));
  }

  const { supabase, user } = await requireStudyToolUser();
  const setId = String(formData.get("setId") ?? "").trim();

  if (!setId) {
    redirect(buildStudyToolRedirect("flashcards", { error: "A flashcard set id is required." }));
  }

  const { data: set, error } = await supabase
    .from("flashcard_sets")
    .select("id, title, source_mode, query_text, document_id")
    .eq("id", setId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !set) {
    redirect(
      buildStudyToolRedirect("flashcards", {
        error: "That flashcard set could not be found.",
      }),
    );
  }

  if (set.source_mode === "manual") {
    redirect(
      buildStudyToolRedirect("flashcards", {
        error: "Manual flashcard sets cannot be regenerated automatically.",
      }),
    );
  }

  const { count } = await supabase
    .from("flashcards")
    .select("*", { count: "exact", head: true })
    .eq("set_id", setId);

  await generateAndStoreFlashcards({
    setId: set.id,
    title: set.title,
    queryText: set.query_text ?? "",
    documentId: set.document_id ?? "",
    requestedCount: clampRequestedStudyItemCount("flashcards", count),
    replaceExisting: true,
  });
}

export async function deleteFlashcardSet(formData: FormData) {
  if (await isDemoSession()) {
    redirect(buildStudyToolRedirect("flashcards", { message: "Flashcard deletion is disabled in demo mode." }));
  }

  const { supabase, user } = await requireStudyToolUser();
  const setId = String(formData.get("setId") ?? "").trim();

  if (!setId) {
    redirect(buildStudyToolRedirect("flashcards", { error: "A flashcard set id is required." }));
  }

  const { error } = await supabase
    .from("flashcard_sets")
    .delete()
    .eq("id", setId)
    .eq("user_id", user.id);

  if (error) {
    redirect(buildStudyToolRedirect("flashcards", { error: "That flashcard set could not be deleted." }));
  }

  revalidatePath("/flashcards");
  redirect(buildStudyToolRedirect("flashcards", { message: "Flashcard set deleted." }));
}
