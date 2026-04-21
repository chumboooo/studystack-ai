"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function buildDashboardRedirect(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();

  return query ? `/dashboard?${query}` : "/dashboard";
}

async function requireDashboardUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return { supabase, user };
}

export async function createPlannerEntry(formData: FormData) {
  const { supabase, user } = await requireDashboardUser();
  const title = String(formData.get("title") ?? "").trim().slice(0, 140);
  const entryDate = String(formData.get("entryDate") ?? "").trim();
  const entryType = String(formData.get("entryType") ?? "study_session").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 600);

  if (!title || !entryDate) {
    redirect(
      buildDashboardRedirect({
        error: "Add a title and date for the study plan.",
      }),
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    redirect(
      buildDashboardRedirect({
        error: "Choose a valid calendar date for the study plan.",
      }),
    );
  }

  const allowedTypes = new Set(["study_session", "quiz_review", "exam_prep", "reminder"]);
  const normalizedEntryType = (
    allowedTypes.has(entryType) ? entryType : "study_session"
  ) as "exam_prep" | "quiz_review" | "reminder" | "study_session";
  const { error } = await supabase.from("study_planner_entries").insert({
    user_id: user.id,
    title,
    entry_date: entryDate,
    entry_type: normalizedEntryType,
    note: note || null,
  });

  if (error) {
    redirect(
      buildDashboardRedirect({
        error: "The study plan could not be saved.",
      }),
    );
  }

  revalidatePath("/dashboard");
  redirect(
    buildDashboardRedirect({
      message: "Study plan saved.",
    }),
  );
}

export async function deletePlannerEntry(formData: FormData) {
  const { supabase, user } = await requireDashboardUser();
  const entryId = String(formData.get("entryId") ?? "").trim();

  if (!entryId) {
    redirect(
      buildDashboardRedirect({
        error: "Choose a study plan to delete.",
      }),
    );
  }

  const { error } = await supabase
    .from("study_planner_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", user.id);

  if (error) {
    redirect(
      buildDashboardRedirect({
        error: "The study plan could not be deleted.",
      }),
    );
  }

  revalidatePath("/dashboard");
  redirect(
    buildDashboardRedirect({
      message: "Study plan deleted.",
    }),
  );
}
