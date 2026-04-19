"use client";

import type { MouseEvent } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function ActionSubmitButton({
  label,
  pendingLabel,
  variant = "secondary",
  className,
}: {
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} disabled={pending} aria-disabled={pending} className={className}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function ConfirmActionSubmitButton({
  label,
  pendingLabel,
  confirmMessage,
  variant = "secondary",
  className,
}: {
  label: string;
  pendingLabel: string;
  confirmMessage: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      aria-disabled={pending}
      className={className}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}
