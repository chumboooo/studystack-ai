"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isDemoSession } from "@/lib/demo/mode";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { validatePlannerEntry } from "@/lib/validation";

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
  if (await isDemoSession()) {
    redirect(
      buildDashboardRedirect({
        message: "Demo planner data is read-only. Use the seeded entries to show the calendar experience.",
      }),
    );
  }

  const { supabase, user } = await requireDashboardUser();
  const validation = validatePlannerEntry({
    title: String(formData.get("title") ?? ""),
    entryDate: String(formData.get("entryDate") ?? "").trim(),
    entryType: String(formData.get("entryType") ?? "study_session").trim(),
    note: String(formData.get("note") ?? ""),
  });

  if (!validation.ok) {
    redirect(
      buildDashboardRedirect({
        error: validation.error,
      }),
    );
  }

  const createRateLimit = checkRateLimit({
    action: "planner-create",
    identifier: user.id,
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });

  if (!createRateLimit.ok) {
    redirect(
      buildDashboardRedirect({
        error: `Too many planner changes were made in a short time. Please wait about ${createRateLimit.retryAfterSeconds} seconds and try again.`,
      }),
    );
  }
  const { error } = await supabase.from("study_planner_entries").insert({
    user_id: user.id,
    title: validation.value.title,
    entry_date: validation.value.entryDate,
    entry_type: validation.value.entryType,
    note: validation.value.note,
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
  if (await isDemoSession()) {
    redirect(
      buildDashboardRedirect({
        message: "Demo planner entries are read-only in local showcase mode.",
      }),
    );
  }

  const { supabase, user } = await requireDashboardUser();
  const entryId = String(formData.get("entryId") ?? "").trim();

  if (!entryId) {
    redirect(
      buildDashboardRedirect({
        error: "Choose a study plan to delete.",
      }),
    );
  }

  const deleteRateLimit = checkRateLimit({
    action: "planner-delete",
    identifier: user.id,
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });

  if (!deleteRateLimit.ok) {
    redirect(
      buildDashboardRedirect({
        error: `Too many planner changes were made in a short time. Please wait about ${deleteRateLimit.retryAfterSeconds} seconds and try again.`,
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
