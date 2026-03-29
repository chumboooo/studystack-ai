"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type ReprocessDocumentButtonProps = {
  label?: string;
  pendingLabel?: string;
  className?: string;
};

function ReprocessDocumentSubmit({
  label = "Reprocess",
  pendingLabel = "Reprocessing...",
  className,
}: ReprocessDocumentButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="ghost"
      className={className}
      disabled={pending}
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}

type ReprocessDocumentFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  documentId: string;
  redirectTo?: string;
  label?: string;
  pendingLabel?: string;
  className?: string;
};

export function ReprocessDocumentForm({
  action,
  documentId,
  redirectTo,
  label,
  pendingLabel,
  className,
}: ReprocessDocumentFormProps) {
  return (
    <form action={action}>
      <input type="hidden" name="documentId" value={documentId} />
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
      <ReprocessDocumentSubmit
        label={label}
        pendingLabel={pendingLabel}
        className={className}
      />
    </form>
  );
}
