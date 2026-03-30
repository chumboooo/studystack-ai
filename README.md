# StudyStack AI

StudyStack AI is a full-stack study assistant that turns user-uploaded PDFs into grounded Q&A, flashcards, and quizzes with citation-backed answers and secure document workflows.

## Overview

StudyStack AI helps students and knowledge workers turn static study material into interactive learning tools. Users can upload PDFs, extract and structure the content, ask grounded questions against their own documents, and generate reusable study assets such as flashcards and quizzes.

The app is built for people who want a more reliable way to study from their own material instead of relying on generic AI answers. The core value is grounded retrieval: answers and generated study tools are based on the user’s uploaded documents, with traceable source references and jump-to-chunk navigation.

## Core Features

- Secure Supabase authentication for sign up, sign in, route protection, and sign out
- Private PDF upload to Supabase Storage
- Server-side PDF text extraction
- Structured chunking pipeline for downstream retrieval
- Hybrid retrieval using semantic search plus keyword/full-text search
- Grounded Q&A with source citations
- Saved Q&A history per user
- Citation links that jump directly to the cited chunk on the document detail page
- Flashcard generation from grounded chunks
- Quiz generation from grounded chunks
- Secure PDF preview and download for private files
- Document reprocess and delete flows

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- OpenAI API
- pgvector for semantic retrieval
- Hybrid retrieval using vector similarity plus full-text / keyword search

## How It Works

1. A signed-in user uploads a PDF.
2. The file is stored in a private Supabase Storage bucket.
3. The server extracts raw text from the PDF.
4. The extracted text is split into retrieval-friendly chunks.
5. Embeddings are generated for each chunk and stored in Postgres.
6. For chat questions, the app retrieves relevant chunks using hybrid retrieval.
7. The answer model receives only the top grounded chunks, not the whole document.
8. The UI shows the answer with source references and jump-to-chunk links.
9. Flashcards and quizzes are generated from grounded chunks, not from raw full-document dumps.

## Architecture

At a high level, the app is organized around a document-processing pipeline plus grounded retrieval and study-tool generation.

**Storage and data**

- PDFs are stored in a private Supabase Storage bucket.
- Document metadata lives in `public.documents`.
- Extraction state and raw text live in `public.document_contents`.
- Retrieval chunks and embeddings live in `public.document_chunks`.
- Saved grounded chat history lives in:
  - `public.chat_sessions`
  - `public.chat_turns`
  - `public.chat_turn_sources`
- Generated study tools live in:
  - `public.flashcard_sets`
  - `public.flashcards`
  - `public.quiz_sets`
  - `public.quiz_questions`

**Retrieval flow**

- Keyword/full-text retrieval uses a Postgres function over chunk content.
- Semantic retrieval uses pgvector over stored chunk embeddings.
- The app merges, reranks, and filters candidates before passing a small grounded context to the model.

## Local Setup

### Prerequisites

- Node.js 20+
- npm
- A Supabase project
- An OpenAI API key

### Install dependencies

```bash
npm install
```

### Environment variables

Create a `.env.local` file and populate it using the values documented in [`.env.example`](/C:/Users/sebas/OneDrive/Desktop/studystack-ai/.env.example).

### Supabase setup

Run the SQL files in Supabase SQL Editor in this order:

1. [supabase/documents.sql](/C:/Users/sebas/OneDrive/Desktop/studystack-ai/supabase/documents.sql)
2. [supabase/storage.sql](/C:/Users/sebas/OneDrive/Desktop/studystack-ai/supabase/storage.sql)
3. [supabase/document_text.sql](/C:/Users/sebas/OneDrive/Desktop/studystack-ai/supabase/document_text.sql)
4. [supabase/chat_history.sql](/C:/Users/sebas/OneDrive/Desktop/studystack-ai/supabase/chat_history.sql)
5. [supabase/study_tools.sql](/C:/Users/sebas/OneDrive/Desktop/studystack-ai/supabase/study_tools.sql)

Supabase requirements:

- Enable Email auth
- Configure the site URL and auth callback URLs
- Create the private `documents` bucket
- Ensure `pgvector` is available so semantic retrieval can run

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

The project uses the following environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=
SUPABASE_DOCUMENTS_BUCKET=documents

OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMENSIONS=1536
```

Notes:

- `OPENAI_API_KEY` is server-only and should never be exposed as a `NEXT_PUBLIC_` variable.
- `SUPABASE_DOCUMENTS_BUCKET` should match the private bucket configured in Supabase.
- `OPENAI_MODEL` is used for grounded answers, flashcards, and quizzes.
- `OPENAI_EMBEDDING_MODEL` and `OPENAI_EMBEDDING_DIMENSIONS` are used for chunk embeddings and semantic retrieval.

## Usage

### Upload documents

- Sign in or create an account
- Open the documents page
- Upload a PDF
- Wait for extraction, chunking, and embedding generation to complete

### Ask grounded questions

- Open the chat page
- Ask a natural-language question about your uploaded material
- Review the answer and inspect the source citations
- Jump directly to the cited chunk from the answer history

### Generate flashcards and quizzes

- Open the flashcards or quizzes page
- Choose a specific document or retrieval across all documents
- Enter a topic prompt and desired item count
- Generate grounded study material from your own chunks

## Screenshots / Demo

### Landing Page

_Add screenshot here_

### Documents Workspace

_Add screenshot here_

### Grounded Chat With Citations

_Add screenshot here_

### Flashcards

_Add screenshot here_

### Quizzes

_Add screenshot here_

## Why This Project Is Strong

StudyStack AI demonstrates a realistic full-stack AI product, not just a model wrapper. It combines authenticated product flows, private file handling, structured document processing, retrieval engineering, grounded generation, persistence, and production-style UI organization in a single application.

From an engineering perspective, it shows:

- end-to-end product architecture
- secure user-scoped data handling
- document ingestion and transformation pipelines
- hybrid retrieval design
- grounded AI application patterns
- practical tradeoffs around cost control, persistence, and reviewability

## Future Improvements

- richer document parsing for more complex PDF layouts
- better study-set customization controls
- stronger retrieval evaluation and tracing
- spaced repetition and progress tracking
- collaborative or shared study spaces

## License

License information can be added here.
