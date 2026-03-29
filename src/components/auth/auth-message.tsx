import { cn } from "@/lib/utils";

type AuthMessageProps = {
  tone: "error" | "success";
  message: string;
};

export function AuthMessage({ tone, message }: AuthMessageProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm leading-6",
        tone === "error"
          ? "border-rose-400/25 bg-rose-400/10 text-rose-100"
          : "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
      )}
    >
      {message}
    </div>
  );
}
