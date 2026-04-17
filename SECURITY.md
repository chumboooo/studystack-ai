# Security Policy

StudyStack AI handles private study documents, generated study materials, and authenticated user data. Please do not report security issues in public GitHub issues.

## Reporting a Vulnerability

If you find a security issue, contact the repository owner privately.

TODO: Add a preferred security contact email or GitHub Security Advisory process before accepting external reports.

## Sensitive Data Guidelines

Please do not share:

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
- Browser security headers are configured in `next.config.ts`.

If you deploy your own copy, verify that all SQL files in `supabase/` have been applied to your Supabase project.
