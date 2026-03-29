import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  href?: string;
  className?: string;
};

export function Logo({ href = "/", className }: LogoProps) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3", className)}>
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#38bdf8_0%,#14b8a6_100%)] shadow-[0_6px_18px_rgba(45,212,191,0.18)]">
        <span className="text-lg font-semibold text-slate-950">S</span>
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
          StudyStack
        </span>
        <span className="text-sm text-slate-300">AI study workflows</span>
      </span>
    </Link>
  );
}
