import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function ChatPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        badge="Chat"
        title="Grounded study conversations"
        description="Use this route for the future document-aware chat workspace, summaries, and follow-up prompts."
        actions={<Button href="/documents">Connect document flow</Button>}
      />

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="space-y-5">
          <div>
            <CardTitle>Suggested prompts</CardTitle>
            <CardDescription>Starter actions for a future AI study assistant.</CardDescription>
          </div>
          <div className="grid gap-3">
            {[
              "Summarize this chapter into 5 key concepts.",
              "Explain the difference between mitosis and meiosis.",
              "Turn this lecture into flashcards.",
            ].map((prompt) => (
              <div key={prompt} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                {prompt}
              </div>
            ))}
          </div>
        </Card>

        <EmptyState
          eyebrow="Chat thread"
          title="No active study conversation yet."
          description="Once uploads and model calls are connected, this area can host a polished chat thread with citations, summaries, and action shortcuts."
          actionLabel="Visit documents"
          actionHref="/documents"
          secondaryActionLabel="Open flashcards"
          secondaryActionHref="/flashcards"
          icon={
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
              <path d="M7 10.5h10M7 14.5h6M6.75 4h10.5A1.75 1.75 0 0 1 19 5.75v8.5A1.75 1.75 0 0 1 17.25 16H11l-4.75 4v-4H6.75A1.75 1.75 0 0 1 5 14.25v-8.5A1.75 1.75 0 0 1 6.75 4Z" />
            </svg>
          }
        />
      </div>
    </div>
  );
}
