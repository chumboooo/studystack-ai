import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  href?: string;
  className?: string;
};

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/20 bg-slate-950 shadow-[0_10px_28px_rgba(45,212,191,0.18)]",
        className,
      )}
    >
      <span className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(103,232,249,0.34),transparent_38%),linear-gradient(135deg,rgba(34,211,238,0.2),rgba(20,184,166,0.12))]" />
      <svg
        viewBox="0 0 40 40"
        aria-hidden="true"
        className="relative h-7 w-7 fill-none stroke-current text-cyan-100"
      >
        <path
          d="M11 14.5 20 9l9 5.5-9 5.5-9-5.5Z"
          className="fill-cyan-300/20 stroke-cyan-100"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="m11 20 9 5.5 9-5.5M11 25.5l9 5.5 9-5.5"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17.25 14.75c.75-.7 2.2-1.04 3.45-.7 1.28.35 1.88 1.17 1.42 1.94-.4.68-1.38.82-2.52.82-1.42 0-2.45.2-2.78.96-.36.82.47 1.62 1.92 1.9 1.3.25 2.65-.04 3.47-.76"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function Logo({ href = "/", className }: LogoProps) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark />
      <span className="flex flex-col">
        <span className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
          StudyStack
        </span>
        <span className="text-sm text-slate-300">Study smarter</span>
      </span>
    </Link>
  );
}
