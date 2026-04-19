create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.flashcard_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  source_mode text not null check (source_mode in ('retrieval', 'document', 'manual')),
  query_text text,
  document_id uuid references public.documents (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.flashcard_sets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt text not null,
  answer text not null,
  source_document_id uuid references public.documents (id) on delete set null,
  source_document_title text,
  source_chunk_id uuid references public.document_chunks (id) on delete set null,
  source_chunk_index integer,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quiz_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  source_mode text not null check (source_mode in ('retrieval', 'document', 'manual')),
  query_text text,
  document_id uuid references public.documents (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.quiz_sets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null,
  choices jsonb not null default '[]'::jsonb,
  correct_choice_index integer not null check (correct_choice_index >= 0 and correct_choice_index <= 3),
  explanation text not null,
  source_document_id uuid references public.documents (id) on delete set null,
  source_document_title text,
  source_chunk_id uuid references public.document_chunks (id) on delete set null,
  source_chunk_index integer,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists flashcard_sets_user_id_updated_at_idx
  on public.flashcard_sets (user_id, updated_at desc);

create index if not exists flashcards_set_id_created_at_idx
  on public.flashcards (set_id, created_at asc);

create index if not exists quiz_sets_user_id_updated_at_idx
  on public.quiz_sets (user_id, updated_at desc);

create index if not exists quiz_questions_set_id_created_at_idx
  on public.quiz_questions (set_id, created_at asc);

drop trigger if exists set_flashcard_sets_updated_at on public.flashcard_sets;
create trigger set_flashcard_sets_updated_at
before update on public.flashcard_sets
for each row
execute function public.set_updated_at();

drop trigger if exists set_quiz_sets_updated_at on public.quiz_sets;
create trigger set_quiz_sets_updated_at
before update on public.quiz_sets
for each row
execute function public.set_updated_at();

alter table public.flashcard_sets enable row level security;
alter table public.flashcards enable row level security;
alter table public.quiz_sets enable row level security;
alter table public.quiz_questions enable row level security;

drop policy if exists "Users can view their own flashcard sets" on public.flashcard_sets;
create policy "Users can view their own flashcard sets"
  on public.flashcard_sets for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own flashcard sets" on public.flashcard_sets;
create policy "Users can insert their own flashcard sets"
  on public.flashcard_sets for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own flashcard sets" on public.flashcard_sets;
create policy "Users can update their own flashcard sets"
  on public.flashcard_sets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own flashcard sets" on public.flashcard_sets;
create policy "Users can delete their own flashcard sets"
  on public.flashcard_sets for delete using (auth.uid() = user_id);

drop policy if exists "Users can view their own flashcards" on public.flashcards;
create policy "Users can view their own flashcards"
  on public.flashcards for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own flashcards" on public.flashcards;
create policy "Users can insert their own flashcards"
  on public.flashcards for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own flashcards" on public.flashcards;
create policy "Users can update their own flashcards"
  on public.flashcards for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own flashcards" on public.flashcards;
create policy "Users can delete their own flashcards"
  on public.flashcards for delete using (auth.uid() = user_id);

drop policy if exists "Users can view their own quiz sets" on public.quiz_sets;
create policy "Users can view their own quiz sets"
  on public.quiz_sets for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own quiz sets" on public.quiz_sets;
create policy "Users can insert their own quiz sets"
  on public.quiz_sets for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own quiz sets" on public.quiz_sets;
create policy "Users can update their own quiz sets"
  on public.quiz_sets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own quiz sets" on public.quiz_sets;
create policy "Users can delete their own quiz sets"
  on public.quiz_sets for delete using (auth.uid() = user_id);

drop policy if exists "Users can view their own quiz questions" on public.quiz_questions;
create policy "Users can view their own quiz questions"
  on public.quiz_questions for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own quiz questions" on public.quiz_questions;
create policy "Users can insert their own quiz questions"
  on public.quiz_questions for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own quiz questions" on public.quiz_questions;
create policy "Users can update their own quiz questions"
  on public.quiz_questions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own quiz questions" on public.quiz_questions;
create policy "Users can delete their own quiz_questions"
  on public.quiz_questions for delete using (auth.uid() = user_id);
