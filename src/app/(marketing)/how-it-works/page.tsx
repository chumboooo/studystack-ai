import { Navbar } from "@/components/marketing/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

const steps = [
  {
    title: "Upload notes, slides, or class materials",
    description:
      "Start by adding the PDFs you already use for class, including lecture notes, readings, and review guides.",
  },
  {
    title: "Ask questions and review important concepts",
    description:
      "Use study chat when you want a clearer explanation, a comparison, or a quick refresher before moving on.",
  },
  {
    title: "Turn material into flashcards and quizzes",
    description:
      "Create practice tools from your uploaded materials so review becomes active instead of passive.",
  },
  {
    title: "Study more efficiently before exams",
    description:
      "Return to saved answers, source sections, flashcards, and quizzes whenever it is time to review.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.13),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.2),transparent_62%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge>How it works</Badge>
            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white sm:text-6xl">
              From class materials to focused review in four steps.
            </h1>
            <p className="mt-6 text-base leading-8 text-slate-300 sm:text-lg">
              StudyStack is designed around the way students already study: collect materials,
              clarify ideas, practice recall, and review before exams.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Button href="/get-started" size="lg">
                Get started
              </Button>
              <Button href="/features" variant="secondary" size="lg">
                Explore features
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 sm:px-10">
        <div className="grid gap-5 lg:grid-cols-4">
          {steps.map((step, index) => (
            <Card key={step.title} className="relative overflow-hidden p-6">
              <div className="absolute right-5 top-5 text-6xl font-semibold text-white/[0.04]">
                {index + 1}
              </div>
              <div className="relative space-y-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-300 text-base font-semibold text-slate-950">
                  {index + 1}
                </div>
                <div className="space-y-3">
                  <CardTitle>{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-8 grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <CardTitle>Ready when your next study session starts.</CardTitle>
            <CardDescription className="mt-3">
              Add your materials once, then come back whenever you need answers, practice, or a
              faster way to review.
            </CardDescription>
          </div>
          <Button href="/get-started" size="lg">
            Start your study space
          </Button>
        </Card>
      </section>
    </main>
  );
}
