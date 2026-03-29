import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SignInPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to reopen your study workspace, review your documents, and continue your learning flow."
    >
      <Card className="space-y-5">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">Email</span>
          <input
            type="email"
            placeholder="you@example.com"
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">Password</span>
          <input
            type="password"
            placeholder="Enter your password"
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
          />
        </label>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Backend auth not connected yet</span>
          <Link href="/sign-up" className="text-cyan-300 transition-colors hover:text-cyan-200">
            Create account
          </Link>
        </div>

        <Button className="w-full" size="lg">
          Sign in
        </Button>
      </Card>
    </AuthShell>
  );
}
