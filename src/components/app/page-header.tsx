import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

type PageHeaderProps = {
  badge: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHeader({ badge, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        <Badge>{badge}</Badge>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
