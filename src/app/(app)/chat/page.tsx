import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";

type ChatPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

function getChunkPreview(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (normalized.length <= 260) {
    return normalized;
  }

  return `${normalized.slice(0, 257)}...`;
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const [{ q }, supabase] = await Promise.all([searchParams, createClient()]);
  const query = q?.trim() ?? "";

  const { data: results, error } =
    query.length > 0
      ? await supabase.rpc("search_document_chunks", {
          query_text: query,
          match_count: 8,
        })
      : { data: [], error: null };

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Search"
        title="Search your study material"
        description="Ask a question or enter a keyword to retrieve the most relevant chunks from your own uploaded documents."
        actions={<Button href="/documents">Manage documents</Button>}
      />

      <div className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
        <Card className="space-y-5">
          <div>
            <CardTitle>Chunk search</CardTitle>
            <CardDescription>
              This retrieval layer is keyword and Postgres powered for now. It scopes results to
              the signed-in user and does not generate final AI answers yet.
            </CardDescription>
          </div>

          <form className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Question or keyword</span>
              <input
                name="q"
                defaultValue={query}
                type="text"
                placeholder="What does the Krebs cycle produce?"
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <Button type="submit">Search chunks</Button>
              <Button href="/chat" variant="secondary">
                Clear
              </Button>
            </div>
          </form>

          <div className="grid gap-3">
            {[
              "Explain the difference between mitosis and meiosis.",
              "What are the outputs of glycolysis?",
              "Show notes about supply and demand equilibrium.",
            ].map((prompt) => (
              <div
                key={prompt}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300"
              >
                {prompt}
              </div>
            ))}
          </div>
        </Card>

        {error ? (
          <Card className="space-y-3">
            <CardTitle>Search setup needs attention</CardTitle>
            <CardDescription>
              Supabase returned an error while searching chunks: {error.message}
            </CardDescription>
            <CardDescription>
              Re-run the document text SQL so the search function and indexes exist.
            </CardDescription>
          </Card>
        ) : query.length === 0 ? (
          <EmptyState
            eyebrow="Retrieval search"
            title="Search over your stored document chunks."
            description="Once you enter a question, StudyStack will return the most relevant chunk matches from your own PDFs using Postgres full-text and keyword search."
            actionLabel="Visit documents"
            actionHref="/documents"
            secondaryActionLabel="Open flashcards"
            secondaryActionHref="/flashcards"
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
              </svg>
            }
          />
        ) : results.length === 0 ? (
          <EmptyState
            eyebrow="No matches"
            title="No chunk matched that search yet."
            description="Try a shorter keyword, a specific concept name, or upload more PDFs so more study content is available to search."
            actionLabel="Search again"
            actionHref={`/chat?q=${encodeURIComponent(query)}`}
            secondaryActionLabel="Visit documents"
            secondaryActionHref="/documents"
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
              </svg>
            }
          />
        ) : (
          <Card className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>Top matches</CardTitle>
                <CardDescription>
                  Results for <span className="font-medium text-white">{query}</span>
                </CardDescription>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                {results.length} results
              </div>
            </div>

            <div className="grid gap-4">
              {results.map((result) => (
                <div
                  key={result.chunk_id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-lg font-semibold text-white">{result.document_title}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
                          <span>Chunk {result.chunk_index + 1}</span>
                          <span>{result.character_count} chars</span>
                          <span>Rank {result.rank.toFixed(3)}</span>
                        </div>
                      </div>
                      <p className="text-sm leading-7 text-slate-300">
                        {getChunkPreview(result.content)}
                      </p>
                    </div>

                    <Button href="/documents" variant="secondary" className="shrink-0">
                      View library
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
