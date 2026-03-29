import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { generateGroundedAnswer } from "@/lib/chat/grounded-answer";
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatches(content: string, query: string) {
  const terms = query
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);

  if (terms.length === 0) {
    return getChunkPreview(content);
  }

  const preview = getChunkPreview(content);
  const expression = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const parts = preview.split(expression);

  return parts.map((part, index) =>
    terms.some((term) => part.toLowerCase() === term.toLowerCase()) ? (
      <mark
        key={`${part}-${index}`}
        className="rounded bg-cyan-300/20 px-1 text-cyan-100"
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const [{ q }, supabase] = await Promise.all([searchParams, createClient()]);
  const query = q?.trim() ?? "";

  const { data: results, error } =
    query.length > 0
      ? await supabase.rpc("search_document_chunks", {
          query_text: query,
          match_count: 5,
        })
      : { data: [], error: null };

  const groundedAnswer =
    query.length > 0 && !error && results.length > 0
      ? await generateGroundedAnswer({
          question: query,
          chunks: results,
        })
      : null;

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
              Retrieval stays scoped to the signed-in user. StudyStack answers with only the top
              matching chunks instead of sending whole documents.
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
              <a
                key={prompt}
                href={`/chat?q=${encodeURIComponent(prompt)}`}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300 transition-colors hover:border-cyan-300/30 hover:bg-white/[0.08]"
              >
                {prompt}
              </a>
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
            description="Enter a question to search only your own extracted PDF content. StudyStack will retrieve a small source set and produce an answer grounded only in those excerpts."
            actionLabel="Visit documents"
            actionHref="/documents"
            secondaryActionLabel="Open dashboard"
            secondaryActionHref="/dashboard"
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
              </svg>
            }
          />
        ) : results.length === 0 ? (
          <EmptyState
            eyebrow="No matches"
            title="No useful source chunks were found."
            description="StudyStack will not guess without grounded source material. Try a shorter keyword, a specific concept name, or reprocess any failed documents first."
            actionLabel="Browse documents"
            actionHref="/documents"
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
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle>Grounded answer</CardTitle>
                  <CardDescription>
                    Answering <span className="font-medium text-white">{query}</span> using the top{" "}
                    {results.length} retrieved chunk{results.length === 1 ? "" : "s"} from your own
                    documents.
                  </CardDescription>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                  {results.length} sources
                </div>
              </div>

              {groundedAnswer?.ok ? (
                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    Answer
                  </p>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-100">
                    {groundedAnswer.answer}
                  </div>
                </div>
              ) : (
                <AlertBanner tone="error">
                  {groundedAnswer?.error ??
                    "StudyStack could not generate an answer from the retrieved sources."}
                </AlertBanner>
              )}

              <AlertBanner tone="info">
                Sources are limited on purpose for cost control. Only the top matching chunks are
                sent to the model, and the answer should stay grounded in them.
              </AlertBanner>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>Source references</CardTitle>
                <CardDescription>
                  Retrieved chunks that were used as grounding material for this answer.
                </CardDescription>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                {results.length} result{results.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="grid gap-4">
              {(groundedAnswer?.usedChunks ?? results).map((result, index) => (
                <div
                  key={result.chunk_id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-white">{result.document_title}</p>
                          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-200">
                            Chunk {result.chunk_index + 1}
                          </span>
                          <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                            S{index + 1}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
                          <span>{result.character_count} chars</span>
                          <span>Rank {result.rank.toFixed(3)}</span>
                        </div>
                      </div>
                      <p className="text-sm leading-7 text-slate-300">
                        {highlightMatches(result.content, query)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col gap-3">
                      <Button
                        href={`/documents/${result.document_id}`}
                        variant="secondary"
                        className="justify-center"
                      >
                        View document
                      </Button>
                      <Button href={`/chat?q=${encodeURIComponent(result.document_title)}`} variant="ghost">
                        Search title
                      </Button>
                    </div>
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
