import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const DEMO_SESSION_COOKIE = "studystack_demo_preview";

export function isDemoModeEnabled() {
  return process.env.DEMO_MODE === "true";
}

export async function isDemoSession() {
  if (!isDemoModeEnabled()) {
    return false;
  }

  const cookieStore = await cookies();
  return cookieStore.get(DEMO_SESSION_COOKIE)?.value === "1";
}

export function isDemoSessionRequest(request: NextRequest) {
  if (!isDemoModeEnabled()) {
    return false;
  }

  return request.cookies.get(DEMO_SESSION_COOKIE)?.value === "1";
}

export async function clearDemoSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_SESSION_COOKIE);
}

export function getDemoModeLabel() {
  return "Preview workspace";
}
