# StudyStack AI

StudyStack AI is a student-focused study app that turns uploaded PDFs into organized study materials, cited answers, flashcards, and quizzes.

## Live Demo

- Production app: [https://studystack-aii.vercel.app/](https://studystack-aii.vercel.app/)

## Overview

StudyStack helps students study from the materials they already use in class. Upload notes, slides, readings, or study guides as PDFs, then use the app to ask questions, review source-backed answers, create flashcards, and build quizzes.

The product is designed around reviewability. Answers and study tools stay connected to the uploaded document sections they came from, so students can verify ideas, revisit source material, and keep their study sessions organized.

## Features

- Secure sign up, sign in, and sign out with protected app routes
- Private PDF upload and authenticated preview/download
- Document library with rename, refresh, delete, sorting, and status feedback
- Server-side PDF text extraction and study-section preparation
- Search across uploaded study materials
- Grounded study chat with saved Q&A history and source citations
- Source links that jump back to the relevant document section
- Flashcard generation from uploaded materials
- Quiz generation with scoring, explanations, and source links
- Student-facing marketing pages for features, workflow, and onboarding
- Practical security hardening for private files, user-scoped data, uploads, and browser headers

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres with Row Level Security
- Supabase Storage for private PDF files
- OpenAI API for grounded answers and study-tool generation
- pgvector for semantic document search
- PDF.js for server-side PDF text extraction

## How It Works

1. A student creates an account and uploads a PDF.
2. StudyStack prepares the document so it can be searched and used for study tools.
3. The student asks questions about the uploaded material.
4. The app finds relevant source sections from that student's documents.
5. Answers, flashcards, and quizzes are generated from those source sections.
6. The student can revisit saved answers and open the exact source section later.

## Screenshots

Screenshots are not committed yet. Suggested files to add later:

- `public/readme/landing-page.png`: homepage hero and navigation
- `public/readme/documents-page.png`: document library with upload and file actions
- `public/readme/chat-with-sources.png`: study chat answer with cited source cards
- `public/readme/flashcards-page.png`: generated flashcard review interface
- `public/readme/quizzes-page.png`: quiz-taking and results view

When screenshots are added, place them in `public/readme/` and reference them here using relative Markdown image links.

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project
- An OpenAI API key

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd studystack-ai
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Then fill in the values for your Supabase project and OpenAI key.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-or-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_DOCUMENTS_BUCKET=documents
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-5-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMENSIONS=1536
```

Important notes:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is intended for the browser and should be a low-privilege Supabase publishable or anon key.
- `OPENAI_API_KEY` must stay server-only. Do not prefix it with `NEXT_PUBLIC_`.
- `SUPABASE_DOCUMENTS_BUCKET` should match the private bucket configured in Supabase.
- Set `NEXT_PUBLIC_SITE_URL` to the deployed app URL in production.

### 4. Run Supabase Setup SQL

Run the SQL files in Supabase SQL Editor in this order:

1. `supabase/documents.sql`
2. `supabase/storage.sql`
3. `supabase/document_text.sql`
4. `supabase/chat_history.sql`
5. `supabase/study_tools.sql`

Supabase setup checklist:

- Enable email authentication.
- Configure the Site URL and callback URLs for local and production environments.
- Keep the `documents` storage bucket private.
- Confirm Row Level Security policies are enabled and applied.
- Confirm `pgvector` is available for semantic search.

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Build for Production

```bash
npm run build
npm run start
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Low-privilege Supabase browser key. |
| `NEXT_PUBLIC_SITE_URL` | Yes | App URL used for auth redirects. Use `http://localhost:3000` locally. |
| `SUPABASE_DOCUMENTS_BUCKET` | Yes | Private Supabase Storage bucket for uploaded PDFs. |
| `OPENAI_API_KEY` | Yes | Server-only OpenAI API key. |
| `OPENAI_MODEL` | Yes | Model used for answers, flashcards, and quizzes. |
| `OPENAI_EMBEDDING_MODEL` | Yes | Model used to embed document sections. |
| `OPENAI_EMBEDDING_DIMENSIONS` | Yes | Embedding size expected by the database schema. |

## Project Structure

```text
src/app/(marketing)        Marketing pages: home, features, how it works, get started
src/app/(auth)             Sign in, sign up, and auth actions
src/app/(app)              Protected study app routes
src/app/api                Server routes for upload finalization
src/components             Shared UI, app, document, chat, flashcard, and quiz components
src/lib                    Supabase, OpenAI, PDF, retrieval, document, and security helpers
supabase                   Database, RLS, storage, and retrieval SQL setup
public/brand               StudyStack logo assets
```

## Security and Privacy Notes

StudyStack is designed for private study materials. The app uses Supabase Auth, Row Level Security, private storage buckets, authenticated PDF preview/download routes, and server-only OpenAI calls.

Security-related implementation details include:

- User-owned tables are scoped with RLS policies.
- Uploaded PDFs are stored in a private bucket under per-user paths.
- PDF uploads are limited to PDF files and capped at 50 MB.
- The OpenAI API key is only used server-side.
- Browser security headers are configured in `next.config.ts`.
- Retrieved document text is treated as untrusted input in AI prompts.

If you deploy your own copy, verify that the SQL policies in `supabase/` are applied in your Supabase project.

## Deployment Notes

This project is ready to deploy on Vercel or a similar Next.js host.

For Vercel:

1. Import the GitHub repository.
2. Add the environment variables listed above.
3. Set `NEXT_PUBLIC_SITE_URL` to the production URL.
4. Add the production callback URL in Supabase Auth settings.
5. Run the Supabase SQL setup before testing uploads or app routes.

Supabase Auth URLs should include:

- Local callback: `http://localhost:3000/auth/callback`
- Production callback: `https://<your-domain>/auth/callback`

## Development Commands

```bash
npm run dev      # Start the local dev server
npm run build    # Create a production build
npm run start    # Run the production build locally
npm run lint     # Run ESLint
```

## Roadmap

Potential future improvements:

- OCR support for scanned PDFs
- Spaced repetition scheduling
- Better class/course organization
- Study progress tracking
- More configurable flashcard and quiz generation
- Optional collaborative study spaces

## License

TODO: Add a license before publishing or accepting external contributions.
