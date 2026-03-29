import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/app/(auth)/actions";
import { AuthMessage } from "@/components/auth/auth-message";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { AuthShell } from "@/components/auth/auth-shell";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type SignInPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const [{ error, message }, supabase] = await Promise.all([searchParams, createClient()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
      </Card>
    </AuthShell>
  );
}
