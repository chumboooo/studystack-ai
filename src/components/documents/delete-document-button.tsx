"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type DeleteDocumentButtonProps = {
  label?: string;
  pendingLabel?: string;
  className?: string;
};

function DeleteDocumentSubmit({
  label = "Delete",
  pendingLabel = "Deleting...",
  className,
}: DeleteDocumentButtonProps) {
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

type DeleteDocumentFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  documentId: string;
  redirectTo?: string;
  confirmMessage: string;
  label?: string;
  pendingLabel?: string;
  className?: string;
};

export function DeleteDocumentForm({
  action,
  documentId,
  redirectTo,
  confirmMessage,
  label,
  pendingLabel,
  className,
}: DeleteDocumentFormProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="documentId" value={documentId} />
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
      <DeleteDocumentSubmit
        label={label}
        pendingLabel={pendingLabel}
        className={className}
      />
    </form>
  );
}
