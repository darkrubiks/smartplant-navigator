# Repository instructions

- Preserve published Git history; do not force-push, amend, rebase, or squash published commits.
- Keep `main` buildable and run lint, typecheck, tests, and production build before publishing.
- This is a static React application with TanStack Router and an external Supabase backend.
- Keep route URLs in hash history and public assets relative to `import.meta.env.BASE_URL`.
- Never commit private environment files, provider keys, or Supabase service-role keys.
