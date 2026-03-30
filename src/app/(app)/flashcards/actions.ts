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
import { generateFlashcardsFromChunks } from "@/lib/study-tools/generate";
import { retrieveStudyChunks } from "@/lib/study-tools/retrieval";

type RetrievedSource = Awaited<ReturnType<typeof retrieveStudyChunks>>;
type GeneratedCards = Awaited<ReturnType<typeof generateFlashcardsFromChunks>>;

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
      buildStudyToolRedirect("flashcards", {
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  if (source.chunks.length === 0) {
    redirect(
      buildStudyToolRedirect("flashcards", {
        error: "No useful chunks were available for flashcard generation.",
      }),
    );
  }

  let cards: GeneratedCards;

  try {
    cards = await generateFlashcardsFromChunks({
      chunks: source.chunks,
      titleHint: title || source.titleHint,
      cardCount: requestedCount,
    });
  } catch (error) {
    redirect(
      buildStudyToolRedirect("flashcards", {
        error: error instanceof Error ? error.message : String(error),
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
      buildStudyToolRedirect("flashcards", {
        error: "The flashcard set could not be created.",
      }),
    );
  }

  if (replaceExisting) {
    await supabase.from("flashcards").delete().eq("set_id", targetSetId);
    await supabase
      .from("flashcard_sets")
      .update({
        title: title || source.titleHint,
        source_mode: source.sourceMode,
        query_text: source.sourceMode === "retrieval" ? retrievalQuery : null,
        document_id: source.documentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetSetId);
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
        error: insertError.message,
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
    buildStudyToolRedirect("flashcards", {
      set: targetSetId,
      message: `${replaceExisting ? "Flashcards regenerated." : "Flashcards generated."}${partialMessage}`,
    }),
  );
}

export async function generateFlashcardSet(formData: FormData) {
  await generateAndStoreFlashcards({
    title: String(formData.get("title") ?? "").trim(),
    queryText: String(formData.get("topic") ?? "").trim(),
    documentId: String(formData.get("documentId") ?? "").trim(),
    requestedCount: parseRequestedStudyItemCount("flashcards", formData.get("count")),
  });
}

export async function regenerateFlashcardSet(formData: FormData) {
  const { supabase } = await requireStudyToolUser();
  const setId = String(formData.get("setId") ?? "").trim();

  if (!setId) {
    redirect(buildStudyToolRedirect("flashcards", { error: "A flashcard set id is required." }));
  }

  const { data: set, error } = await supabase
    .from("flashcard_sets")
    .select("id, title, query_text, document_id")
    .eq("id", setId)
    .maybeSingle();

  if (error || !set) {
    redirect(
      buildStudyToolRedirect("flashcards", {
        error: error?.message ?? "That flashcard set could not be found.",
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
  const { supabase } = await requireStudyToolUser();
  const setId = String(formData.get("setId") ?? "").trim();

  if (!setId) {
    redirect(buildStudyToolRedirect("flashcards", { error: "A flashcard set id is required." }));
  }

  const { error } = await supabase.from("flashcard_sets").delete().eq("id", setId);

  if (error) {
    redirect(buildStudyToolRedirect("flashcards", { error: error.message }));
  }

  revalidatePath("/flashcards");
  redirect(buildStudyToolRedirect("flashcards", { message: "Flashcard set deleted." }));
}
