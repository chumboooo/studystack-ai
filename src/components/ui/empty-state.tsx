import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type EmptyStateProps = {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  icon: ReactNode;
};

export function EmptyState({
  eyebrow,
  title,
  description,
  actionLabel,
  actionHref,
  secondaryActionLabel,
  secondaryActionHref,
  icon,
}: EmptyStateProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
            {icon}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
              {eyebrow}
            </p>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button href={actionHref}>{actionLabel}</Button>
          {secondaryActionLabel && secondaryActionHref ? (
            <Button href={secondaryActionHref} variant="secondary">
              {secondaryActionLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
