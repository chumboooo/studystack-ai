import { NextResponse } from "next/server";
import { DEMO_SESSION_COOKIE, isDemoModeEnabled } from "@/lib/demo/mode";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  if (!isDemoModeEnabled()) {
    return NextResponse.redirect(
      new URL("/sign-in?message=Demo%20preview%20is%20not%20available.", requestUrl),
    );
  }

  const response = NextResponse.redirect(
    new URL("/dashboard?message=Preview%20workspace%20loaded.", requestUrl),
  );

  response.cookies.set({
    name: DEMO_SESSION_COOKIE,
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
