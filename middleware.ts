import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAllowedOrigin } from "@/lib/security/origin";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD" && !isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
