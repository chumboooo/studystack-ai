import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type StudyToolKind = "flashcards" | "quizzes";

const DEFAULT_REQUESTED_COUNTS: Record<StudyToolKind, number> = {
  flashcards: 8,
  quizzes: 5,
};

export function buildStudyToolRedirect(
  tool: StudyToolKind,
  params: Record<string, string>,
) {
  const query = new URLSearchParams(params).toString();

  return query ? `/${tool}?${query}` : `/${tool}`;
}

export function parseRequestedStudyItemCount(
  tool: StudyToolKind,
  value: FormDataEntryValue | null,
) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_REQUESTED_COUNTS[tool];
  }

  return Math.min(Math.max(parsed, 1), 24);
}

export function clampRequestedStudyItemCount(tool: StudyToolKind, count: number | null) {
  return Math.min(Math.max(count ?? DEFAULT_REQUESTED_COUNTS[tool], 1), 24);
}

export async function requireStudyToolUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return { supabase, user };
}

export function buildPartialGenerationMessage({
  actualCount,
  requestedCount,
  tool,
}: {
  actualCount: number;
  requestedCount: number;
  tool: StudyToolKind;
}) {
  if (actualCount >= requestedCount) {
    return "";
  }

  if (tool === "flashcards") {
    return ` Generated ${actualCount} of ${requestedCount} requested flashcards because only ${actualCount} distinct study cards could be created from the selected material.`;
  }

  return ` Generated ${actualCount} of ${requestedCount} requested quiz questions because only ${actualCount} distinct questions could be created from the selected material.`;
}
