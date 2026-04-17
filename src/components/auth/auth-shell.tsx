import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden overflow-hidden border-r border-white/10 lg:block">
        <div className="relative flex h-full flex-col justify-between bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] p-10">
          <Logo />
          <div className="space-y-6">
            <Badge>Built for focused study</Badge>
            <h1 className="max-w-lg text-5xl font-semibold tracking-tight text-white">
              Turn dense course material into review sessions that actually stick.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-300">
              Upload notes, generate flashcards, quiz yourself, and keep every concept in a
              single learning loop.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Documents", value: "124" },
              { label: "Flashcards", value: "3.8k" },
              { label: "Quiz accuracy", value: "92%" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-white/10 bg-white/[0.05] p-5"
              >
                <p className="text-sm text-slate-400">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-16 sm:px-10">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-3 lg:hidden">
            <Logo />
            <Badge>StudyStack account</Badge>
          </div>
          <div className="space-y-3">
            <h2 className="text-4xl font-semibold tracking-tight text-white">{title}</h2>
            <p className="text-sm leading-6 text-slate-300">{description}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
