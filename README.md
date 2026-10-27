# Mercedes SmartPlant Navigator

A single static HTML page for the São Bernardo do Campo plant, retaining the original full-screen map layout: floating Mercedes branding and language buttons, bottom search and quick destinations, a slide-out building directory with image cards, and floating route guidance. The page uses native CSS and JavaScript modules. No React, bundler, database, account, API key, or production server is needed.

## Change buildings without changing code

Edit **[data/buildings.csv](data/buildings.csv)** and commit the change to GitHub's `main` branch. GitHub Actions validates the CSV and automatically deploys the page to GitHub Pages. Editing names, descriptions, locations, categories, and contact details changes the corresponding cards and map markers. Add or remove rows to add or remove buildings.

Read **[the CSV editing guide](data/README.md)** for column definitions, Excel/LibreOffice instructions, quoting, coordinate measurement, and deployment troubleshooting. A local edit must be committed and pushed/uploaded to GitHub to update the public site. The page checks for published catalog changes every 60 seconds while visible, when returning to its tab, and through **Refresh data**. Deployment and GitHub caching may add a delay.

## Main functions

- Search by number, name, description, department, responsible person, or keywords in English or Portuguese; accents are ignored.
- Filter buildings by category; keep favorites and the last five route destinations on the device.
- Explore the original plant drawing with labeled markers, drag/pinch/scroll zoom, zoom buttons, or keyboard arrows and +/−/0.
- Select a building for its description, department, contact, opening hours, dock, and map coordinates.
- Plan routes from any catalog building for walking, car, truck, or forklift. See approximate distance, time, arrival time, and turn instructions.
- Simulate a route at 25× speed, pause, restart, recalculate, and confirm arrival locally for the current route.
- Request a fresh browser GPS location with its reported accuracy. Coordinates stay in the browser and appear on a separate coordinate grid; the uncalibrated plant drawing does not support GPS projection.
- Switch between English and Brazilian Portuguese. The preference is saved locally.

Arrival confirmation is local to the current page session; no arrival record is sent to a server. Favorites, recent destinations, and the language preference use local storage when available. The external Supabase backend is no longer used or required. It was not modified or deleted during the conversion. The original public catalog was read and exported, preserving all 69 current rows and their UUIDs; source records with no description remain blank.

## Files

| Path                                                                      | Purpose                                                       |
| ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `index.html`                                                              | The only HTML page                                            |
| `assets/styles.css`                                                       | Responsive styling                                            |
| `assets/app.js`                                                           | Directory, map controls, navigation, and browser interactions |
| `assets/csv.js`                                                           | CSV parsing, validation, and loading                          |
| `assets/buildings.js`, `assets/catalog-translations.js`, `assets/i18n.js` | Search and bilingual text                                     |
| `assets/plant.js`, `assets/routing.js`                                    | Original map geometry and street routing                      |
| `assets/geolocation.js`                                                   | Browser GPS lookup                                            |
| `data/buildings.csv`                                                      | Editable source of truth for buildings                        |
| `scripts/`, `tests/`                                                      | Small local preview/packaging helpers and regression checks   |

The static site can be served directly from this folder over HTTP/HTTPS. Opening `index.html` by double-clicking (`file://`) is not supported because browsers restrict module and CSV requests. No compilation is needed to run the page.

## Local preview and checks

For preview only, use Node.js 22.12+ with **no dependency installation**:

```sh
node scripts/serve.mjs
```

Open the printed local URL (normally `http://127.0.0.1:4173/`). Edit the CSV, click **Refresh data**, and the page updates. HTML/CSS/JavaScript changes require a browser refresh.

For development checks, install the five development-only tools:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run build` validates the CSV, cleans `dist/`, then copies only the HTML, public assets, and data into it. It does not bundle or transpile the app. TypeScript checks the JavaScript directly with `checkJs`; the tests cover CSV editing/validation, bilingual search, street routes, and location handling. `npm run format` formats the maintained source.

## GitHub Pages

The existing `.github/workflows/deploy.yml` runs lint, JavaScript type checks, tests, and the static packaging step on pushes and pull requests to `main`. Every push to `main`, including a CSV-only edit, publishes the validated `dist/` artifact when repository variable `PAGES_ENABLED=true`. Pull requests validate without deploying. Manual workflow dispatch is also supported.

Keep **Settings → Pages → Build and deployment → Source** set to **GitHub Actions**, and keep **Settings → Secrets and variables → Actions → Variables → PAGES_ENABLED** set to `true` for deployment. No Supabase or base-path variables are needed. All URLs are relative, so the page works at a repository path or at a custom domain root. The existing production target is [darkrubiks.github.io/smartplant-navigator](https://darkrubiks.github.io/smartplant-navigator/).

Shared links use `#/`, `#/building/<id>`, and `#/nav/<id>` with optional `?from=<id>&mode=pedestrian` after the hash. Existing `#/nav/<uuid>` links still work because exported IDs were retained. Hash URLs also work after refresh on Pages.

If an edit does not appear, check the latest Actions run, verify that it deployed successfully, then use **Refresh data** or reload after GitHub's cache updates. Invalid CSV rows report the row number in the build log and cannot replace the last successful deployment. A page that already loaded valid data keeps displaying that catalog if a later fetch or parse fails.

Workflow setup follows [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Migration and private configuration

The original framework source, database schema, and migration helpers have been archived locally under ignored `.migration-backup/`; published Git history is preserved. None of those files are part of the site or required to edit it. Existing private environment files remain ignored and are never copied to `dist/`. Do not commit keys or private environment files. Only the static page, public assets, and catalog are published.
