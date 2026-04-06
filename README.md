# StudyStack AI

StudyStack AI is a full-stack AI study assistant that turns private PDFs into searchable study material, grounded answers with citations, flashcards, and quizzes.

## Live Demo

- Production app: [https://studystack-aii.vercel.app/](https://studystack-aii.vercel.app/)

## Overview

StudyStack AI is built for students and self-learners who want to study from their own material instead of relying on generic AI responses. Users upload PDFs, the app prepares the content for search and retrieval, and then generates answers and study tools that stay tied to the original source material.

The core product value is grounded study support. Questions, flashcards, and quizzes are generated from user-owned document sections rather than from broad, unverified model recall. The result is a more reviewable study workflow with clear citations and source navigation.

## Core Features

- Secure Supabase authentication with protected app routes
- Private PDF upload to Supabase Storage
- Direct browser-to-storage upload flow for larger study documents
- Server-side PDF text extraction in a Next.js runtime
- Document sectioning and embedding generation for retrieval
- Hybrid retrieval using semantic search plus keyword/full-text search
- Grounded Q&A with source citations
- Saved Q&A history per user
- Source links that jump directly to the cited document section
- Flashcard generation from source-backed document sections
- Quiz generation from source-backed document sections
- Secure PDF preview and download for private files
- Document reprocess, rename, and delete flows

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

1. A signed-in user uploads a PDF from the browser directly to a private Supabase Storage bucket.
2. The app creates a document record and downloads the stored PDF server-side for processing.
3. PDF text is extracted on the server.
4. The extracted content is split into retrieval-friendly document sections.
5. Embeddings are generated once per section and stored in Postgres.
6. For chat questions, the app retrieves relevant sections using hybrid retrieval.
7. The answer model receives only a small set of top source sections, not the full document.
8. The UI shows the answer with citations and direct source links.
9. Flashcards and quizzes are generated from retrieved source sections, not from full-document dumps.

## Architecture

StudyStack AI is organized around three layers: document ingestion, retrieval, and grounded study tools.

### Data and Storage

- Private PDFs are stored in a Supabase Storage bucket.
- Document metadata lives in `public.documents`.
- Extraction state and extracted text live in `public.document_contents`.
- Retrieval sections and embeddings live in `public.document_chunks`.
- Saved chat history lives in:
  - `public.chat_sessions`
  - `public.chat_turns`
  - `public.chat_turn_sources`
- Generated study tools live in:
  - `public.flashcard_sets`
  - `public.flashcards`
  - `public.quiz_sets`
  - `public.quiz_questions`

### Retrieval Flow

- Postgres full-text and keyword search provide lexical candidates.
- pgvector similarity search provides semantic candidates.
- The app merges and reranks candidates before sending a small grounded context to the answer or study-tool generator.

## Engineering Highlights

- End-to-end full-stack product architecture across auth, storage, database, UI, and deployment
- Secure user-scoped data handling with Supabase RLS and private storage access
- Direct-to-storage upload architecture that avoids server request-size bottlenecks for larger PDFs
- Retrieval engineering with hybrid search, reranking, and source-aware grounding
- Practical AI product constraints such as cost control, saved outputs, reviewable citations, and server-only model usage

## Local Setup

### Prerequisites

- Node.js 20+
- npm
- A Supabase project
- An OpenAI API key

### Install Dependencies

```bash
npm install
```

### Environment Variables

Create `.env.local` from [`.env.example`](/C:/Users/sebas/OneDrive/Desktop/studystack-ai/.env.example).

Required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_DOCUMENTS_BUCKET=documents

OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMENSIONS=1536
```

Notes:

- `OPENAI_API_KEY` is server-only and must not be exposed as a `NEXT_PUBLIC_` variable.
- `SUPABASE_DOCUMENTS_BUCKET` must match the private bucket configured in Supabase.
- `OPENAI_MODEL` is used for grounded answers, flashcards, and quizzes.
- `OPENAI_EMBEDDING_MODEL` and `OPENAI_EMBEDDING_DIMENSIONS` are used for document section embeddings.
- `NEXT_PUBLIC_SITE_URL` should be your deployed app URL in production.

### Supabase Setup

Run the SQL files in Supabase SQL Editor in this order:

1. [documents.sql](/C:/Users/sebas/OneDrive/Desktop/studystack-ai/supabase/documents.sql)
2. [storage.sql](/C:/Users/sebas/OneDrive/Desktop/studystack-ai/supabase/storage.sql)
3. [document_text.sql](/C:/Users/sebas/OneDrive/Desktop/studystack-ai/supabase/document_text.sql)
4. [chat_history.sql](/C:/Users/sebas/OneDrive/Desktop/studystack-ai/supabase/chat_history.sql)
5. [study_tools.sql](/C:/Users/sebas/OneDrive/Desktop/studystack-ai/supabase/study_tools.sql)

Supabase requirements:

- Enable Email auth
- Configure the site URL and auth callback URLs
- Keep the `documents` bucket private
- Ensure `pgvector` is available for semantic retrieval

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Developer Commands

```bash
npm run dev
npm run build
npm run lint
```

## Deployment

### Vercel

1. Push the repository to GitHub.
2. Import the project into Vercel.
3. Add the required environment variables in Vercel Project Settings.
4. Deploy.
5. Update Supabase Auth URL settings to match the deployed domain.
6. Redeploy after env var changes.

Required Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_DOCUMENTS_BUCKET`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_EMBEDDING_MODEL`
- `OPENAI_EMBEDDING_DIMENSIONS`

Recommended production values:

- `NEXT_PUBLIC_SITE_URL=https://studystack-aii.vercel.app`
- `SUPABASE_DOCUMENTS_BUCKET=documents`
- `OPENAI_MODEL=gpt-5-mini`
- `OPENAI_EMBEDDING_MODEL=text-embedding-3-small`
- `OPENAI_EMBEDDING_DIMENSIONS=1536`

### Supabase Auth URL Configuration

In Supabase Authentication URL settings, configure:

- Site URL:
  `https://studystack-aii.vercel.app`
- Redirect URLs:
  `http://localhost:3000/auth/callback`
  `https://studystack-aii.vercel.app/auth/callback`

If preview deployments need auth support, add the corresponding preview callback URLs as well.

### Storage Notes

- Keep the documents bucket private.
- The documented bucket setup in [storage.sql](/C:/Users/sebas/OneDrive/Desktop/studystack-ai/supabase/storage.sql) uses:
  - PDF-only MIME restrictions
  - per-user path-based access policies
  - a 50 MB file size limit
- PDF preview and download are served through an authenticated server route, not public file URLs.

## Usage

### Upload Documents

- Sign in or create an account
- Open the documents page
- Upload a PDF
- Wait for processing to complete

### Ask Grounded Questions

- Open the chat page
- Ask a natural-language question about your uploaded material
- Review the answer and its cited sources
- Open the cited document section directly from the answer

### Generate Flashcards and Quizzes

- Open the flashcards or quizzes page
- Choose a specific document or all uploaded documents
- Enter a topic and item count
- Generate study material backed by your own uploaded sources

## Why This Project Matters

StudyStack AI is a strong portfolio project because it demonstrates more than model integration. It shows how to build a complete product around AI workflows: secure auth, private file handling, document processing, retrieval design, grounded generation, persistence, and production-style UI delivery in one system.

## Future Improvements

- Richer parsing for more complex or scanned PDFs
- Better study-set customization and filtering controls
- Retrieval evaluation and tracing
- Spaced repetition and progress tracking
- Collaborative study spaces
