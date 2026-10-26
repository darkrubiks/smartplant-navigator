# Mercedes SmartPlant Navigator

Independent plant navigator for Mercedes-Benz São Bernardo do Campo: searchable
map, routes for walking/car/truck/forklift, supplier check-in, account access,
operations dashboard, and marker administration. The existing UI, street graph,
map, building catalog integration, and Supabase row-level policies are preserved.

Source: https://github.com/darkrubiks/smartplant-navigator (public, branch `main`).

## Architecture

- React 19, TypeScript, Vite 8, TanStack Router and Query
- Tailwind CSS 4, Radix UI, Leaflet/React Leaflet, Recharts
- External Supabase Database and Auth; SQL migrations in `supabase/migrations`
- Optional independent AI backend, configured by URL; see `docs/ai-backend.md`

The frontend is a static SPA and builds to `dist/`. GitHub Pages serves the
frontend; it does not run the database, authentication service, or AI backend.
There is no Node production server or proprietary editor runtime dependency.

## Local setup

Use Node.js 22.12+ (Node 22 is used by CI) and npm.

```sh
npm ci
cp .env.example .env
# Fill in your Supabase project's public URL and publishable key in .env
npm run dev
```

The existing local `.env` is preserved and ignored by Git. Only `.env.example`
belongs in source control. Vite exposes every `VITE_` value in the browser:
never use service-role keys, secret Supabase keys, or AI provider credentials.

| Variable                        | Purpose                                                                  |
| ------------------------------- | ------------------------------------------------------------------------ |
| `VITE_SUPABASE_URL`             | Existing Supabase project URL                                            |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public browser key; database access is governed by RLS                   |
| `VITE_AI_ENDPOINT`              | Optional HTTPS endpoint implementing the documented assistant contract   |
| `VITE_BASE_PATH`                | `/` locally; `/<repository>/` for project Pages; `/` for a custom domain |

The original Supabase project is still referenced in `supabase/config.toml`.
No database was copied, reset, or migrated remotely. For a new independently
managed Supabase project, review the included schema/RLS migrations, link it with
the Supabase CLI, then run `supabase db push` and update the public environment
variables. Existing demo supplier tokens have expiration dates and may need
replacement through the admin page. Do not reset production data.

## Authentication

Email/password authentication continues through Supabase. Google login now uses
Supabase OAuth directly, with PKCE and automatic code exchange before the router
starts. Configure Google's client ID and secret in Supabase Auth > Providers,
using your own Google OAuth application. Register the Supabase callback URL in
Google, and add the full frontend base URL (including the repository path and
trailing slash) to Supabase's allowed redirect URLs and site URL. For example,
`https://darkrubiks.github.io/smartplant-navigator/`. This provider configuration
is required independently of the frontend migration. Do not put the Google client
secret in frontend variables. Email confirmation behavior follows Supabase settings.

## Routes and refresh

| URL fragment       | Access    | Purpose                                             |
| ------------------ | --------- | --------------------------------------------------- |
| `#/`               | Public    | Plant map, directory, quick destinations, assistant |
| `#/nav/:destId`    | Public    | Route guidance and simulation                       |
| `#/checkin/:token` | Public    | Supplier delivery check-in                          |
| `#/auth`           | Public    | Email/password and Google login                     |
| `#/dashboard`      | Signed in | Operational metrics                                 |
| `#/admin`          | Signed in | Supplier links and marker editor                    |

Database RLS limits administrative writes to the `admin` role. Hash routing lets
shared URLs and browser refresh work on static hosting. Supplier links generated
by the admin page include both the repository base path and the hash. Old clean
URLs such as `/nav/id` are not automatically redirected by GitHub Pages; distribute
the new hash URLs. The map and all public assets respect the configured base path.

## Commands

| Command             | Purpose                                                                     |
| ------------------- | --------------------------------------------------------------------------- |
| `npm run dev`       | Development server                                                          |
| `npm run lint`      | ESLint; existing Fast Refresh and navigation hook warnings are non-blocking |
| `npm run typecheck` | TypeScript source and generated-route checks                                |
| `npm test`          | Built-in Node test runner for assistant contract and action validation      |
| `npm run build`     | Generate route tree and create static production files                      |
| `npm run preview`   | Preview the production build                                                |
| `npm run format`    | Format source with Prettier                                                 |

Run `npm run build` before type checking if route files have changed, so
`src/routeTree.gen.ts` is regenerated. Generated route and database types are
excluded from formatting/linting. Use the npm lockfile for reproducible installs.

## GitHub Actions and Pages

`.github/workflows/deploy.yml` runs on pushes to `main` and manual dispatch. It
installs with `npm ci`, runs lint, builds/generates routes, runs TypeScript and
tests, checks public configuration, and uploads `dist/` as a Pages artifact.
Deployment uses the official GitHub Actions, minimal job permissions, a shared
concurrency group, and the `github-pages` environment; the deployment URL appears
in the run summary.

In repository Settings > Secrets and variables > Actions, set these **variables**:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and optionally
`VITE_AI_ENDPOINT`. These values are public browser configuration. The workflow
calculates `/<repository>/` automatically; set `VITE_BASE_PATH` only to override it.

The owner chose to make this repository **public** to use Pages with the verified
GitHub Free account. Pages is configured to deploy through GitHub Actions, with
repository variable `PAGES_ENABLED=true`. Each push to `main` validates and deploys
the app; manual workflow dispatch is also available. Both the source and the
published website are public. Consult
https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages.

Production URL:
`https://darkrubiks.github.io/smartplant-navigator/`.

If source privacy is needed later, GitHub Pages from a private personal repository
requires a supporting plan such as Pro. Review hosting before changing visibility.
No alternate provider or paid plan is provisioned here.

## Troubleshooting

- Startup configuration message: fill the two Supabase variables and rebuild.
- Empty building directory: check the Supabase project, table migrations, RLS,
  and browser network errors. A successful static build does not verify database health.
- Google login fails: enable Google in Supabase, configure the OAuth application,
  and allow the precise frontend redirect URL with its repository path.
- Assistant says unconfigured: deploy an authorized independent backend and set
  `VITE_AI_ENDPOINT`; do not embed provider credentials. This was deferred by request.
- Missing map or assets: verify the trailing slash in `VITE_BASE_PATH` and rebuild.
- Pages job skipped: enable Pages and set `PAGES_ENABLED=true`.
- Pages errors after changing to a private repository: check plan eligibility and
  choose an appropriate plan or hosting strategy before publishing again.

## Local migration archive

`.migration-backup/` preserves replaced integration files and original package
manifests locally. It is excluded from Git along with old generated output,
local logs, dependency folders, private configuration, and the existing pitch deck.
Original external projects, repositories, and backend infrastructure were not deleted.
