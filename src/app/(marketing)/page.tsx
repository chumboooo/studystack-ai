import { Navbar } from "@/components/marketing/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Notes into study tools",
    description: "Turn lecture notes, textbook chapters, and slides into flashcards and quizzes.",
  },
  {
    title: "Answers from your materials",
    description: "Ask questions and get help based on the documents you uploaded.",
  },
  {
    title: "Practice for exams",
    description: "Move from passive reading to active recall with focused review sessions.",
  },
];

const workflow = [
  "Upload notes, slides, or readings for a class.",
  "Ask questions when a concept feels unclear.",
  "Generate flashcards and quizzes to prepare for exams.",
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
              <Button href="/dashboard" variant="secondary" size="lg">
                Open your study space
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

      <section id="features" className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Badge>Study tools</Badge>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Everything you need to study from your own materials.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Keep notes, questions, source references, flashcards, and quizzes together so every
            review session has a clear next step.
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
              Designed for active recall, not passive reading.
            </h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              StudyStack helps you move from uploading notes to practicing what matters most.
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

      <section id="start" className="mx-auto max-w-7xl px-6 pb-24 sm:px-10">
        <Card className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <Badge>Start studying</Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Bring your next study session into focus.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Upload your notes, ask questions, and turn the material into review tools when you
              are ready to practice.
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
