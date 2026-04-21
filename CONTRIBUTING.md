# Contributing

StudyStack AI is focused on a polished, student-facing study experience. Contributions should preserve existing flows and keep the UI clear for normal users.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment example:

```bash
cp .env.example .env.local
```

3. Add Supabase and OpenAI values, then run:

```bash
npm run dev
```

## Development Guidelines

- Keep changes small and readable.
- Preserve auth, uploads, documents, threaded chat, planner entries, flashcards, quizzes, manual study tools, and secure preview/download flows.
- Keep Supabase user scoping and RLS assumptions intact.
- Keep OpenAI usage server-side.
- Avoid exposing internal implementation details in user-facing UI.
- Prefer student-friendly wording over developer or infrastructure language.
- Run `npm run build` before opening a PR when possible.

## Pull Requests

Pull request descriptions should include:

- What changed
- How it was tested
- Any setup or migration notes
- Screenshots for UI changes, if available

Issues, commits, screenshots, and PR descriptions must not include real API keys, database credentials, or private user data.
