"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const appNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: "01" },
  { href: "/documents", label: "Documents", icon: "02" },
  { href: "/chat", label: "Chat", icon: "03" },
  { href: "/flashcards", label: "Flashcards", icon: "04" },
  { href: "/quizzes", label: "Quizzes", icon: "05" },
];

type SidebarProps = {
  userEmail?: string;
};

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-80 shrink-0 border-r border-white/10 bg-slate-950/70 px-6 py-8 lg:flex lg:flex-col">
      <Logo href="/" />

      <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-3">
        <nav className="space-y-2">
          {appNavItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                    "flex items-center gap-4 rounded-2xl px-4 py-3 transition-colors",
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

      <div className="mt-auto rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.08] p-5">
        <p className="text-sm font-semibold text-white">{userEmail ?? "Signed in"}</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Keep your notes, questions, flashcards, and quizzes organized in one place.
        </p>
        <SignOutButton variant="ghost" className="mt-4 w-full justify-center border border-white/10" />
      </div>
    </aside>
  );
}
