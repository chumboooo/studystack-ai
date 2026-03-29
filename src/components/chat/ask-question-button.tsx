"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function AskQuestionButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "Asking..." : "Ask StudyStack"}
    </Button>
  );
}
