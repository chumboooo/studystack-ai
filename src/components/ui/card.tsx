import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-6 shadow-[0_12px_32px_rgba(2,6,23,0.28)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: CardProps) {
  return <h3 className={cn("text-lg font-semibold text-white", className)}>{children}</h3>;
}

export function CardDescription({ children, className }: CardProps) {
  return <p className={cn("text-sm leading-6 text-slate-300", className)}>{children}</p>;
}
