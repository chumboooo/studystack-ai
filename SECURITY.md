# Security Policy

StudyStack AI handles private study documents, saved chat threads, planner entries, generated study materials, manual study tools, and authenticated user data. Security issues should not be reported in public GitHub issues.

## Reporting a Vulnerability

Security reports should be sent privately through GitHub security advisories when available, or through another private maintainer contact channel listed on the repository profile.

## Sensitive Data Guidelines

Security reports and project discussions should not include:

- Real API keys or tokens
- Supabase service role keys
- Database passwords
- Private PDFs or user documents
- Screenshots containing private study materials
- Auth cookies or session values

## Security Notes

This project is designed to keep privileged operations server-side:

- OpenAI API keys are server-only.
- Supabase browser clients use a low-privilege public key.
- User-owned data relies on Supabase Row Level Security.
- Uploaded PDFs are stored in a private Supabase Storage bucket.
- PDF preview and download are served through authenticated routes.
- Chat sessions, planner entries, flashcards, quizzes, and document actions are scoped to the signed-in user.
- Browser security headers are configured in `next.config.ts`.

Self-hosted deployments should verify that all SQL files in `supabase/` have been applied to the target Supabase project.
