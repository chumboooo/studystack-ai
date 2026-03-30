create extension if not exists vector;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.document_contents (
  document_id uuid primary key references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  extraction_status text not null default 'pending'
    check (extraction_status in ('pending', 'completed', 'failed')),
  chunk_count integer not null default 0,
  raw_text text not null default '',
  page_count integer,
  extracted_at timestamptz,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  character_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (document_id, chunk_index)
);

alter table public.document_contents
  add column if not exists chunk_count integer not null default 0;

alter table public.document_chunks
  add column if not exists character_count integer not null default 0;

alter table public.document_chunks
  add column if not exists embedding vector(1536);

create index if not exists document_contents_user_id_status_idx
  on public.document_contents (user_id, extraction_status);

create index if not exists document_chunks_document_id_idx
  on public.document_chunks (document_id, chunk_index);

create index if not exists document_chunks_user_id_idx
  on public.document_chunks (user_id);

create index if not exists document_chunks_content_fts_idx
  on public.document_chunks
  using gin (to_tsvector('english', content));

create index if not exists document_chunks_embedding_idx
  on public.document_chunks
  using hnsw (embedding vector_cosine_ops);

drop trigger if exists set_document_contents_updated_at on public.document_contents;
create trigger set_document_contents_updated_at
before update on public.document_contents
for each row
execute function public.set_updated_at();

alter table public.document_contents enable row level security;
alter table public.document_chunks enable row level security;

drop policy if exists "Users can view their own document contents" on public.document_contents;
create policy "Users can view their own document contents"
  on public.document_contents
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own document contents" on public.document_contents;
create policy "Users can insert their own document contents"
  on public.document_contents
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own document contents" on public.document_contents;
create policy "Users can update their own document contents"
  on public.document_contents
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own document contents" on public.document_contents;
create policy "Users can delete their own document contents"
  on public.document_contents
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own document chunks" on public.document_chunks;
create policy "Users can view their own document chunks"
  on public.document_chunks
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own document chunks" on public.document_chunks;
create policy "Users can insert their own document chunks"
  on public.document_chunks
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own document chunks" on public.document_chunks;
create policy "Users can update their own document chunks"
  on public.document_chunks
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own document chunks" on public.document_chunks;
create policy "Users can delete their own document chunks"
  on public.document_chunks
  for delete
  using (auth.uid() = user_id);

create or replace function public.search_document_chunks(query_text text, match_count integer default 8)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  chunk_index integer,
  content text,
  character_count integer,
  created_at timestamptz,
  rank real
)
language sql
stable
as $$
  with prepared as (
    select
      trim(query_text) as normalized_query,
      websearch_to_tsquery('english', trim(query_text)) as ts_query
  )
  select
    chunks.id as chunk_id,
    chunks.document_id,
    documents.title as document_title,
    chunks.chunk_index,
    chunks.content,
    chunks.character_count,
    chunks.created_at,
    ts_rank_cd(to_tsvector('english', chunks.content), prepared.ts_query)::real as rank
  from public.document_chunks as chunks
  join public.documents as documents
    on documents.id = chunks.document_id
  cross join prepared
  where chunks.user_id = auth.uid()
    and prepared.normalized_query <> ''
    and (
      to_tsvector('english', chunks.content) @@ prepared.ts_query
      or chunks.content ilike '%' || prepared.normalized_query || '%'
    )
  order by
    (to_tsvector('english', chunks.content) @@ prepared.ts_query) desc,
    ts_rank_cd(to_tsvector('english', chunks.content), prepared.ts_query) desc,
    chunks.created_at desc
  limit greatest(coalesce(match_count, 8), 1);
$$;

create or replace function public.match_document_chunks_by_embedding(
  query_embedding vector(1536),
  match_count integer default 8
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  chunk_index integer,
  content text,
  character_count integer,
  created_at timestamptz,
  similarity real
)
language sql
stable
as $$
  select
    chunks.id as chunk_id,
    chunks.document_id,
    documents.title as document_title,
    chunks.chunk_index,
    chunks.content,
    chunks.character_count,
    chunks.created_at,
    (1 - (chunks.embedding <=> query_embedding))::real as similarity
  from public.document_chunks as chunks
  join public.documents as documents
    on documents.id = chunks.document_id
  where chunks.user_id = auth.uid()
    and chunks.embedding is not null
  order by chunks.embedding <=> query_embedding
  limit greatest(coalesce(match_count, 8), 1);
$$;
