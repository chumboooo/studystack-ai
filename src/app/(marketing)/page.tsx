import { Navbar } from "@/components/marketing/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(45,212,191,0.1),transparent_20%)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />
        <div className="relative mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl gap-12 px-6 py-20 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
          <div className="space-y-8">
            <Badge>Built for focused learning</Badge>
            <div className="space-y-6">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Turn your notes into a study space that helps you learn faster.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Upload class notes, ask questions about the material, and create flashcards and
                quizzes when it is time to review.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button href="/sign-up" size="lg">
                Start studying
              </Button>
              <Button href="/features" variant="secondary" size="lg">
                Explore features
              </Button>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-slate-400">
              <span>Organize class materials</span>
              <span>Review with flashcards</span>
              <span>Practice with quizzes</span>
            </div>
          </div>

          <Card className="relative overflow-hidden p-0">
            <div className="border-b border-white/10 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Study workspace</p>
                  <p className="text-sm text-slate-400">Biology 201 final review</p>
                </div>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-200">
                  Study-ready
                </span>
              </div>
            </div>

            <div className="grid gap-5 p-5">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Docs", value: "18" },
                  { label: "Cards", value: "264" },
                  { label: "Quizzes", value: "12" },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-400">{item.label}</p>
                    <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  Chat summary
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Mitochondria generate ATP through cellular respiration. Focus your next review on
                  the Krebs cycle and the electron transport chain.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-slate-400">Upcoming quiz set</p>
                  <p className="mt-2 text-lg font-semibold text-white">Cell structures</p>
                  <p className="mt-1 text-sm text-slate-400">10 questions generated today</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-slate-400">Flashcard mastery</p>
                  <p className="mt-2 text-lg font-semibold text-white">78% retained</p>
                  <p className="mt-1 text-sm text-slate-400">24 cards due for review</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
