import { Navbar } from "@/components/marketing/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

const startingPoints = [
  {
    title: "New to StudyStack?",
    description:
      "Create an account, upload your first PDF, and start building a study library around your classes.",
    action: "Create account",
    href: "/sign-up",
  },
  {
    title: "Already have an account?",
    description:
      "Sign in to reopen your documents, saved answers, flashcards, and quizzes.",
    action: "Sign in",
    href: "/sign-in",
  },
];

const checklist = [
  "Choose one class or exam to focus on first.",
  "Upload notes, slides, or a study guide as a PDF.",
  "Ask one question about a concept you want to understand.",
  "Generate flashcards or a quiz when you are ready to practice.",
];

export default function GetStartedPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,0.14),transparent_26%),radial-gradient(circle_at_85%_15%,rgba(45,212,191,0.1),transparent_24%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-20 sm:px-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-24">
          <div className="space-y-6">
            <Badge>Get started</Badge>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                Start with one class. Build your study space from there.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                StudyStack helps you turn the materials you already have into answers,
                flashcards, quizzes, and faster review sessions.
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
          </div>

          <Card className="space-y-5 p-6">
            <div>
              <CardTitle>Your first study session</CardTitle>
              <CardDescription className="mt-2">
                A simple path to get value from StudyStack quickly.
              </CardDescription>
            </div>
            <div className="grid gap-3">
              {checklist.map((item, index) => (
                <div
                  key={item}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-sm font-semibold text-slate-950">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm leading-6 text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 sm:px-10">
        <div className="grid gap-5 lg:grid-cols-2">
          {startingPoints.map((point) => (
            <Card key={point.title} className="space-y-5 p-6">
              <div className="space-y-3">
                <CardTitle>{point.title}</CardTitle>
                <CardDescription>{point.description}</CardDescription>
              </div>
              <Button href={point.href}>{point.action}</Button>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
