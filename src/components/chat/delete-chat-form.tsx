"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type HiddenField = {
  name: string;
  value?: string | null;
};

type DeleteChatFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  fields: HiddenField[];
  confirmMessage: string;
  label?: string;
  pendingLabel?: string;
  className?: string;
};

function DeleteChatSubmit({
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

export function DeleteChatForm({
  action,
  fields,
  confirmMessage,
  label,
  pendingLabel,
  className,
}: DeleteChatFormProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {fields
        .filter((field) => field.value)
        .map((field) => (
          <input key={field.name} type="hidden" name={field.name} value={field.value ?? ""} />
        ))}
      <DeleteChatSubmit label={label} pendingLabel={pendingLabel} className={className} />
    </form>
  );
}

export function DeleteChatSessionForm({
  action,
  sessionId,
  returnSessionId,
  returnTurnId,
  confirmMessage,
  label,
  pendingLabel,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  sessionId: string;
  returnSessionId?: string | null;
  returnTurnId?: string | null;
  confirmMessage: string;
  label?: string;
  pendingLabel?: string;
  className?: string;
}) {
  return (
    <DeleteChatForm
      action={action}
      confirmMessage={confirmMessage}
      label={label ?? "Delete chat"}
      pendingLabel={pendingLabel}
      className={className}
      fields={[
        { name: "sessionId", value: sessionId },
        { name: "returnSessionId", value: returnSessionId },
        { name: "returnTurnId", value: returnTurnId },
      ]}
    />
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
    <DeleteChatForm
      action={action}
      confirmMessage={confirmMessage}
      label={label}
      pendingLabel={pendingLabel}
      className={className}
      fields={[
        { name: "turnId", value: turnId },
        { name: "returnSessionId", value: returnSessionId },
        { name: "returnTurnId", value: returnTurnId },
      ]}
    />
  );
}
