# Repository instructions

- Preserve published Git history; do not force-push, amend, rebase, or squash published commits.
- Keep `main` buildable and run lint, typecheck, tests, and production build before publishing.
- This is a single static HTML page with native CSS/JavaScript modules and an editable CSV catalog. It needs no runtime framework or database.
- Keep route URLs in hash history and all assets and CSV requests relative to the page/module URL so GitHub Pages repository paths work without configuration.
- `data/buildings.csv` is the source of truth for building records. Validate it before publishing; preserve existing IDs so shared links remain valid.
- Never commit private environment files, provider keys, or Supabase service-role keys.
