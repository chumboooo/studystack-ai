"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

function buildRedirect(path: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `${path}?${searchParams.toString()}`;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(
      buildRedirect("/sign-in", {
        error: "Email and password are required.",
      }),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(
      buildRedirect("/sign-in", {
        error: error.message,
      }),
    );
  }

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!fullName || !email || !password) {
    redirect(
      buildRedirect("/sign-up", {
        error: "Full name, email, and password are required.",
      }),
    );
  }

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    redirect(
      buildRedirect("/sign-up", {
        error: error.message,
      }),
    );
  }

  if (data.session) {
    redirect("/dashboard");
  }

  redirect(
    buildRedirect("/sign-in", {
      message: "Check your email to confirm your account, then sign in.",
    }),
  );
}
