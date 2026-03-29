import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSafeNext(next: string | null) {
  if (!next || !next.startsWith("/")) {
    return "/dashboard";
  }

  return next;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNext(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  return NextResponse.redirect(
    new URL("/sign-in?error=We%20could%20not%20verify%20your%20email%20link.", requestUrl.origin),
  );
}
