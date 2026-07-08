import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/app/(auth)/actions";
import { AuthMessage } from "@/components/auth/auth-message";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isDemoModeEnabled, isDemoSession } from "@/lib/demo/mode";
import { createClient } from "@/lib/supabase/server";

type SignInPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const demoAvailable = isDemoModeEnabled();
  const [{ error, message }, demoSessionActive] = await Promise.all([searchParams, isDemoSession()]);

  if (demoSessionActive) {
    redirect("/dashboard");
  }

  let user = null;

  try {
    const supabase = await createClient();
    user = (await supabase.auth.getUser()).data.user;
  } catch {
    user = null;
  }

  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to reopen your study workspace, review your documents, and continue your learning flow."
    >
      <Card className="space-y-5">
        {error ? <AuthMessage tone="error" message={error} /> : null}
        {message ? <AuthMessage tone="success" message={message} /> : null}

        <form action={signIn} className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Email</span>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Password</span>
            <input
              name="password"
              type="password"
              placeholder="Enter your password"
              required
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
            />
          </label>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Secure email and password sign-in</span>
            <Link href="/sign-up" className="text-cyan-300 transition-colors hover:text-cyan-200">
              Create account
            </Link>
          </div>

          <AuthSubmitButton idleLabel="Sign in" pendingLabel="Signing in..." />
        </form>

        {demoAvailable ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-white">Want to explore first?</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Open a seeded preview workspace to see chat, documents, flashcards, quizzes, and the planner without creating an account.
            </p>
            <Button href="/demo" variant="secondary" className="mt-4 w-full justify-center">
              Try demo
            </Button>
          </div>
        ) : null}
      </Card>
    </AuthShell>
  );
}
