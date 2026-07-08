"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const appNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: "01" },
  { href: "/chat", label: "Chat", icon: "02" },
  { href: "/documents", label: "Documents", icon: "03" },
  { href: "/flashcards", label: "Flashcards", icon: "04" },
  { href: "/quizzes", label: "Quizzes", icon: "05" },
];

type SidebarProps = {
  userEmail?: string;
  isDemoMode?: boolean;
};

export function Sidebar({ userEmail, isDemoMode = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-white/8 bg-slate-950/55 px-5 py-7 lg:flex lg:flex-col">
      <Logo href="/" />

      <div className="mt-9 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-2.5">
        <nav className="space-y-2">
          {appNavItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                    "flex items-center gap-4 rounded-2xl px-3.5 py-3 transition-colors",
                  active
                    ? "bg-cyan-300 text-slate-950"
                    : "text-slate-300 hover:bg-white/[0.07] hover:text-white",
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl border text-xs font-semibold",
                    active
                      ? "border-slate-950/10 bg-slate-950/10 text-slate-950"
                      : "border-white/10 bg-white/5 text-slate-400",
                  )}
                >
                  {item.icon}
                </span>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className={cn("text-xs", active ? "text-slate-800" : "text-slate-500")}>
                    Study space
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-4.5">
        <p className="text-sm font-semibold text-white">{userEmail ?? "Signed in"}</p>
        {isDemoMode ? (
          <p className="mt-2 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-cyan-100">
            Preview
          </p>
        ) : null}
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Keep your notes, questions, flashcards, and quizzes organized in one place.
        </p>
        <SignOutButton
          variant="ghost"
          className="mt-4 w-full justify-center border border-white/10"
          isDemoMode={isDemoMode}
        />
      </div>
    </aside>
  );
}
