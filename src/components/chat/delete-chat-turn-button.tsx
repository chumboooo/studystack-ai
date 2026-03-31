"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

function DeleteChatTurnSubmit({
  label = "Delete",
  pendingLabel = "Deleting...",
  className,
}: {
  label?: string;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="ghost" className={className} disabled={pending} aria-disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function DeleteChatTurnForm({
  action,
  turnId,
  returnSessionId,
  returnTurnId,
  confirmMessage,
  label,
  pendingLabel,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  turnId: string;
  returnSessionId?: string | null;
  returnTurnId?: string | null;
  confirmMessage: string;
  label?: string;
  pendingLabel?: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="turnId" value={turnId} />
      {returnSessionId ? <input type="hidden" name="returnSessionId" value={returnSessionId} /> : null}
      {returnTurnId ? <input type="hidden" name="returnTurnId" value={returnTurnId} /> : null}
      <DeleteChatTurnSubmit label={label} pendingLabel={pendingLabel} className={className} />
    </form>
  );
}
