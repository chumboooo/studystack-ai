# Contributing

Thanks for taking a look at StudyStack AI. This project is focused on a polished, student-facing study experience, so contributions should preserve existing flows and keep the UI clear for normal users.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment example:

```bash
cp .env.example .env.local
```

3. Fill in Supabase and OpenAI values, then run:

```bash
npm run dev
```

## Development Guidelines

- Keep changes small and readable.
- Preserve auth, uploads, documents, chat, flashcards, quizzes, and secure preview/download flows.
- Keep Supabase user scoping and RLS assumptions intact.
- Keep OpenAI usage server-side.
- Avoid exposing internal implementation details in user-facing UI.
- Prefer student-friendly wording over developer or infrastructure language.
- Run `npm run build` before opening a PR when possible.

## Pull Requests

Before opening a PR, include:

- What changed
- How it was tested
- Any setup or migration notes
- Screenshots for UI changes, if available

Do not include real API keys, database credentials, or private user data in issues, commits, screenshots, or PR descriptions.
