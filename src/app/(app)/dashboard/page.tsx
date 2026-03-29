import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Documents processed", value: "18", change: "+4 this week" },
  { label: "Flashcards reviewed", value: "264", change: "+12 today" },
  { label: "Quiz completion", value: "92%", change: "+8% improvement" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        badge="Overview"
        title="Study dashboard"
        description="Track what you have uploaded, what is ready for review, and where to continue next."
        actions={
          <>
            <Button href="/documents" variant="secondary">
              Upload flow
            </Button>
            <Button href="/chat">Open chat</Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent study spaces</CardTitle>
              <CardDescription>Jump back into active subjects and review queues.</CardDescription>
            </div>
            <Button href="/documents" variant="secondary">
              View all
            </Button>
          </div>
          <div className="grid gap-4">
            {[
              {
                course: "Biology 201",
                detail: "18 documents, 82 flashcards, 3 quizzes",
                status: "High momentum",
              },
              {
                course: "Intro to Economics",
                detail: "7 documents, 41 flashcards, 2 quizzes",
                status: "Needs review",
              },
              {
                course: "Spanish Vocabulary",
                detail: "12 notes, 140 flashcards, 0 quizzes",
                status: "Card-first deck",
              },
            ].map((item) => (
              <div
                key={item.course}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-base font-medium text-white">{item.course}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs text-slate-300">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <CardTitle>Next best actions</CardTitle>
            <CardDescription>Suggested routes based on your study pipeline.</CardDescription>
          </div>
          <div className="grid gap-4">
            {[
              { title: "Add a new lecture PDF", href: "/documents" },
              { title: "Ask chat to summarize key concepts", href: "/chat" },
              { title: "Generate a fresh flashcard deck", href: "/flashcards" },
              { title: "Create a timed quiz", href: "/quizzes" },
            ].map((item) => (
              <Button key={item.title} href={item.href} variant="secondary" className="justify-between">
                {item.title}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
