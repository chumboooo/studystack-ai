"use client";

import { useId } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type DocumentTitleFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  documentId: string;
  initialTitle: string;
  redirectTo?: string;
  compact?: boolean;
};

function SubmitButton({ compact }: { compact?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="secondary"
      size={compact ? "md" : "lg"}
      disabled={pending}
      aria-disabled={pending}
      className={compact ? "min-w-[7rem]" : undefined}
    >
      {pending ? "Saving..." : "Save title"}
    </Button>
  );
}

export function DocumentTitleForm({
  action,
  documentId,
  initialTitle,
  redirectTo,
  compact,
}: DocumentTitleFormProps) {
  const titleId = useId();

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="documentId" value={documentId} />
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
      <div className={compact ? "space-y-2" : "space-y-3"}>
        <label htmlFor={titleId} className="text-sm font-medium text-slate-200">
          Document title
        </label>
        <div className={compact ? "flex flex-col gap-3 sm:flex-row" : "flex flex-col gap-3"}>
          <input
            id={titleId}
            name="title"
            type="text"
            defaultValue={initialTitle}
            maxLength={160}
            required
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
            aria-label="Document title"
          />
          <SubmitButton compact={compact} />
        </div>
      </div>
    </form>
  );
}
