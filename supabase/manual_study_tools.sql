alter table public.flashcard_sets
drop constraint if exists flashcard_sets_source_mode_check;

alter table public.flashcard_sets
add constraint flashcard_sets_source_mode_check
check (source_mode in ('retrieval', 'document', 'manual'));

alter table public.quiz_sets
drop constraint if exists quiz_sets_source_mode_check;

alter table public.quiz_sets
add constraint quiz_sets_source_mode_check
check (source_mode in ('retrieval', 'document', 'manual'));

alter table public.flashcards
alter column source_document_title drop not null,
alter column source_chunk_index drop not null;

alter table public.quiz_questions
alter column source_document_title drop not null,
alter column source_chunk_index drop not null;
