create table if not exists public.study_planner_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  entry_date date not null,
  entry_type text not null default 'study_session'
    check (entry_type in ('study_session', 'quiz_review', 'exam_prep', 'reminder')),
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists study_planner_entries_user_id_entry_date_idx
  on public.study_planner_entries (user_id, entry_date asc);

drop trigger if exists set_study_planner_entries_updated_at on public.study_planner_entries;
create trigger set_study_planner_entries_updated_at
before update on public.study_planner_entries
for each row
execute function public.set_updated_at();

alter table public.study_planner_entries enable row level security;

drop policy if exists "Users can view their own planner entries" on public.study_planner_entries;
create policy "Users can view their own planner entries"
  on public.study_planner_entries for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own planner entries" on public.study_planner_entries;
create policy "Users can insert their own planner entries"
  on public.study_planner_entries for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own planner entries" on public.study_planner_entries;
create policy "Users can update their own planner entries"
  on public.study_planner_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own planner entries" on public.study_planner_entries;
create policy "Users can delete their own planner entries"
  on public.study_planner_entries for delete using (auth.uid() = user_id);
