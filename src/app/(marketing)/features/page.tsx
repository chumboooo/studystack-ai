import { Navbar } from "@/components/marketing/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

const featureGroups = [
  {
    title: "Upload and organize study materials",
    description:
      "Keep notes, slides, reading packets, and review guides in one clean library for each class.",
    detail: "Built for class notes, PDFs, and exam prep packets.",
  },
  {
    title: "Ask questions about your notes",
    description:
      "When something feels confusing, ask a question and review the answer alongside the source section.",
    detail: "Helpful for definitions, comparisons, and concept review.",
  },
  {
    title: "Generate flashcards",
    description:
      "Turn important ideas into active-recall cards so you can check what you remember quickly.",
    detail: "Great for vocabulary, formulas, processes, and key facts.",
  },
  {
    title: "Build quizzes",
    description:
      "Create multiple-choice practice from your materials and review explanations after each attempt.",
    detail: "Useful when you want to test yourself before an exam.",
  },
  {
    title: "Keep study tools in one place",
    description:
      "Save documents, answers, sources, flashcards, and quizzes so every review session is easy to restart.",
    detail: "Less tab-hopping, more focused studying.",
  },
  {
    title: "Review with confidence",
    description:
      "Jump back to the source material when you want to double-check an answer or revisit a concept.",
    detail: "Designed to keep studying connected to your own notes.",
  },
];

const highlights = ["Class notes", "Study guides", "Flashcards", "Practice quizzes"];

export default function FeaturesPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(45,212,191,0.1),transparent_24%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
            <div className="space-y-6">
              <Badge>Features</Badge>
              <div className="space-y-5">
                <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                  Study tools built around the materials you already have.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                  Upload your class materials, ask questions when you get stuck, and turn the same
                  notes into flashcards and quizzes for focused review.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button href="/get-started" size="lg">
                  Start studying
                </Button>
                <Button href="/how-it-works" variant="secondary" size="lg">
                  See how it works
                </Button>
              </div>
            </div>

            <Card className="grid gap-4 p-5 sm:grid-cols-2">
              {highlights.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-slate-400">StudyStack supports</p>
                  <p className="mt-2 text-xl font-semibold text-white">{item}</p>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 sm:px-10">
        <div className="grid gap-5 lg:grid-cols-3">
          {featureGroups.map((feature) => (
            <Card key={feature.title} className="space-y-5 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
                  <path d="M5 7.75A1.75 1.75 0 0 1 6.75 6h10.5A1.75 1.75 0 0 1 19 7.75v8.5A1.75 1.75 0 0 1 17.25 18H6.75A1.75 1.75 0 0 1 5 16.25Z" />
                  <path d="M8 10h8M8 13.5h5" />
                </svg>
              </div>
              <div className="space-y-3">
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </div>
              <p className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm leading-6 text-slate-300">
                {feature.detail}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
