import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AlertBannerProps = {
  tone?: "success" | "error" | "info";
  children: ReactNode;
  className?: string;
};

const toneStyles = {
  success: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
  error: "border-rose-400/25 bg-rose-400/10 text-rose-100",
  info: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
};

export function AlertBanner({
  tone = "info",
  children,
  className,
}: AlertBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("rounded-2xl border px-4 py-3 text-sm leading-6", toneStyles[tone], className)}
    >
      {children}
    </div>
  );
}
