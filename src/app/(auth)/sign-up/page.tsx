import Link from "next/link";
import { redirect } from "next/navigation";
import { signUp } from "@/app/(auth)/actions";
import { AuthMessage } from "@/components/auth/auth-message";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isDemoModeEnabled, isDemoSession } from "@/lib/demo/mode";
import { createClient } from "@/lib/supabase/server";

type SignUpPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const demoAvailable = isDemoModeEnabled();
  const [{ error }, demoSessionActive] = await Promise.all([searchParams, isDemoSession()]);

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
      title="Create your workspace"
      description="Set up your StudyStack account to organize documents, ask questions, and generate study tools in one place."
    >
      <Card className="space-y-5">
        {error ? <AuthMessage tone="error" message={error} /> : null}

        <form action={signUp} className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Full name</span>
            <input
              name="fullName"
              type="text"
              placeholder="Alex Morgan"
              required
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
            />
          </label>

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
              placeholder="Create a password"
              required
              minLength={8}
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
            />
          </label>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Create your account to start studying</span>
            <Link href="/sign-in" className="text-cyan-300 transition-colors hover:text-cyan-200">
              Already have an account?
            </Link>
          </div>

          <AuthSubmitButton idleLabel="Create account" pendingLabel="Creating account..." />
        </form>

        {demoAvailable ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-white">Prefer a quick preview?</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Enter the seeded demo workspace to review the product before signing up.
            </p>
            <Button href="/demo" variant="secondary" className="mt-4 w-full justify-center">
              Explore demo
            </Button>
          </div>
        ) : null}
      </Card>
    </AuthShell>
  );
}
