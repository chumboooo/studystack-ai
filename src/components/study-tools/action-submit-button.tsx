"use client";

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
