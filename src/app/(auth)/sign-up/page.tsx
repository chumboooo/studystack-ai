import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your workspace"
      description="Set up your StudyStack account to organize documents, ask questions, and generate study tools in one place."
    >
      <Card className="space-y-5">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">Full name</span>
          <input
            type="text"
            placeholder="Alex Morgan"
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
          />
        </label>

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
            placeholder="Create a password"
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
          />
        </label>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">No real auth logic wired yet</span>
          <Link href="/sign-in" className="text-cyan-300 transition-colors hover:text-cyan-200">
            Already have an account?
          </Link>
        </div>

        <Button className="w-full" size="lg">
          Create account
        </Button>
      </Card>
    </AuthShell>
  );
}
