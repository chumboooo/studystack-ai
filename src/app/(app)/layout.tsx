import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.09),transparent_18%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="flex min-h-screen">
        <Sidebar userEmail={user.email} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar userEmail={user.email} />
          <div className="flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
