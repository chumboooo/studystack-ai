import { NextResponse } from "next/server";
import { DEMO_SESSION_COOKIE } from "@/lib/demo/mode";

export async function GET(request: Request) {
  const response = NextResponse.redirect(
    new URL("/sign-in?message=Preview%20workspace%20closed.", request.url),
  );

  response.cookies.set({
    name: DEMO_SESSION_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });

  return response;
}
