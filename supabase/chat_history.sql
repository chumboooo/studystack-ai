create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chat_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null,
  answer text not null default '',
  status text not null default 'completed'
    check (status in ('completed', 'no_sources', 'failed')),
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chat_turn_sources (
  id uuid primary key default gen_random_uuid(),
  turn_id uuid not null references public.chat_turns (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  source_label text not null,
  document_id uuid,
  chunk_id uuid,
  document_title text not null,
  chunk_index integer not null,
  rank real,
  content_excerpt text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists chat_sessions_user_id_updated_at_idx
  on public.chat_sessions (user_id, updated_at desc);

create index if not exists chat_turns_session_id_created_at_idx
  on public.chat_turns (session_id, created_at desc);

create index if not exists chat_turns_user_id_created_at_idx
  on public.chat_turns (user_id, created_at desc);

create index if not exists chat_turn_sources_turn_id_idx
  on public.chat_turn_sources (turn_id, created_at asc);

drop trigger if exists set_chat_sessions_updated_at on public.chat_sessions;
create trigger set_chat_sessions_updated_at
before update on public.chat_sessions
for each row
execute function public.set_updated_at();

drop trigger if exists set_chat_turns_updated_at on public.chat_turns;
create trigger set_chat_turns_updated_at
before update on public.chat_turns
for each row
execute function public.set_updated_at();

alter table public.chat_sessions enable row level security;
alter table public.chat_turns enable row level security;
alter table public.chat_turn_sources enable row level security;

drop policy if exists "Users can view their own chat sessions" on public.chat_sessions;
create policy "Users can view their own chat sessions"
  on public.chat_sessions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own chat sessions" on public.chat_sessions;
create policy "Users can insert their own chat sessions"
  on public.chat_sessions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own chat sessions" on public.chat_sessions;
create policy "Users can update their own chat sessions"
  on public.chat_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own chat sessions" on public.chat_sessions;
create policy "Users can delete their own chat sessions"
  on public.chat_sessions
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own chat turns" on public.chat_turns;
create policy "Users can view their own chat turns"
  on public.chat_turns
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own chat turns" on public.chat_turns;
create policy "Users can insert their own chat turns"
  on public.chat_turns
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own chat turns" on public.chat_turns;
create policy "Users can update their own chat turns"
  on public.chat_turns
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own chat turns" on public.chat_turns;
create policy "Users can delete their own chat turns"
  on public.chat_turns
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own chat turn sources" on public.chat_turn_sources;
create policy "Users can view their own chat turn sources"
  on public.chat_turn_sources
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own chat turn sources" on public.chat_turn_sources;
create policy "Users can insert their own chat turn sources"
  on public.chat_turn_sources
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own chat turn sources" on public.chat_turn_sources;
create policy "Users can update their own chat turn sources"
  on public.chat_turn_sources
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own chat turn sources" on public.chat_turn_sources;
create policy "Users can delete their own chat turn sources"
  on public.chat_turn_sources
  for delete
  using (auth.uid() = user_id);
