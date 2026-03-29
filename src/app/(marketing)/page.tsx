import { Navbar } from "@/components/marketing/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "From PDFs to study assets",
    description: "Turn lecture notes, textbook chapters, and slides into structured study sets.",
  },
  {
    title: "Chat grounded in your material",
    description: "Ask questions against your uploaded docs instead of generic model memory.",
  },
  {
    title: "Adaptive flashcards and quizzes",
    description: "Move from passive reading to active recall with generated practice modes.",
  },
];

const workflow = [
  "Upload a document set for a course or topic.",
  "Open chat to clarify concepts and summarize difficult sections.",
  "Generate flashcards and quizzes to reinforce retention.",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(45,212,191,0.1),transparent_20%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
          <div className="space-y-8">
            <Badge>Built for focused learning</Badge>
            <div className="space-y-6">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Your study materials, transformed into an AI-powered learning system.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                StudyStack AI helps students and self-learners organize documents, ask grounded
                questions, and turn content into flashcards and quizzes in a single workflow.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button href="/sign-up" size="lg">
                Start building your stack
              </Button>
              <Button href="/dashboard" variant="secondary" size="lg">
                Preview the dashboard
              </Button>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-slate-400">
              <span>No backend wired yet</span>
              <span>Responsive MVP shell</span>
              <span>Ready for auth and AI integrations</span>
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
                  4 active modules
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

      <section id="features" className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Badge>Product structure</Badge>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              A polished UI foundation for the full StudyStack product.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            The MVP focuses on believable product structure: landing flow, auth entry points, and
            dashboard destinations for documents, chat, flashcards, and quizzes.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="space-y-4">
              <div className="h-12 w-12 rounded-2xl border border-cyan-300/15 bg-cyan-300/10" />
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </Card>
          ))}
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-6 pb-20 sm:px-10">
        <Card className="grid gap-10 overflow-hidden lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <Badge>Study workflow</Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Designed for active recall, not passive storage.
            </h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Every route in the app shell maps to a real product capability so future integrations
              have a clear home from day one.
            </p>
          </div>
          <div className="space-y-4">
            {workflow.map((step, index) => (
              <div
                key={step}
                className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-sm font-semibold text-slate-950">
                  0{index + 1}
                </div>
                <p className="pt-1 text-sm leading-7 text-slate-300">{step}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-6 pb-24 sm:px-10">
        <Card className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <Badge>MVP launch</Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Ready for auth, storage, and AI features next.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              The UI shell is designed so Supabase, document ingestion, and model-powered study
              tools can slot in without reworking the information architecture.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/sign-up" size="lg">
              Create account
            </Button>
            <Button href="/sign-in" variant="secondary" size="lg">
              Sign in
            </Button>
          </div>
        </Card>
      </section>
    </main>
  );
}
