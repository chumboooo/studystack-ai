import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { AlertBanner } from "@/components/ui/alert-banner";
import { getDemoWorkspaceData } from "@/lib/demo/data";
import { getDemoModeLabel, isDemoSession } from "@/lib/demo/mode";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const demoMode = await isDemoSession();
  const user = demoMode
    ? getDemoWorkspaceData().user
    : (
        await (async () => {
          const supabase = await createClient();
          return supabase.auth.getUser();
        })()
      ).data.user;

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.09),transparent_18%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="flex min-h-screen">
        <Sidebar userEmail={user.email} isDemoMode={demoMode} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar userEmail={user.email} isDemoMode={demoMode} />
          <div className="flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
            {demoMode ? (
              <AlertBanner tone="info" className="mb-6 border-white/10 bg-white/[0.04] text-slate-100">
                {getDemoModeLabel()} is active. This seeded workspace is isolated from real accounts and is intended for product preview only.
              </AlertBanner>
            ) : null}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
