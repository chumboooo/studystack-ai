"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/documents", label: "Documents" },
  { href: "/chat", label: "Chat" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/quizzes", label: "Quizzes" },
];

type TopbarProps = {
  userEmail?: string;
};

export function Topbar({ userEmail }: TopbarProps) {
  const pathname = usePathname();

  return (
    <div className="border-b border-white/10 bg-slate-950/90 px-5 py-4 backdrop-blur-md sm:px-8 lg:hidden">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
            StudyStack AI
          </p>
          <p className="text-sm text-slate-300">{userEmail ?? "Dashboard workspace"}</p>
        </div>
        <SignOutButton variant="secondary" size="md" />
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {mobileNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              pathname === item.href
                ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-300/40 hover:text-white",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
