# certves

Design once, generate certificates automatically. Upload a page for each design,
map your participant data (CSV / XLSX), and export pixel-perfect PDFs — one per
person or all of them as a single ZIP.

## Stack

- [SvelteKit](https://svelte.dev/docs/kit) 2 + Svelte 5 (runes) + Vite
- Tailwind CSS 4
- `pdf-lib` for PDF generation, `jszip` for bundling, `xlsx` for spreadsheet import
- `@libsql/client` — local SQLite by default, or Turso for a shared/global database
- Google OAuth (PKCE) for sign-in; usable anonymously without it

## Requirements

- Node 20+ and pnpm (`corepack enable`)

## Setup

1. Install dependencies:

   ```sh
   pnpm install
   ```

2. Create your env file from the example:

   ```sh
   cp .env.example .env
   ```

3. Fill in `.env` (all optional — the app runs with a local SQLite DB and no
   sign-in if left blank):
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` for Google sign-in
   - `DATABASE_URL` (local SQLite path) **or** `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
   - `PUBLIC_GOOGLE_SITE_VERIFICATION` for Search Console (see below)

## Develop

```sh
pnpm dev
```

## Build & preview

```sh
pnpm build
pnpm preview
```

> The app uses `@sveltejs/adapter-node`. Set `ORIGIN` to your public URL at
> runtime, and raise `BODY_SIZE_LIMIT` (default 512 KB) if projects grow beyond it:
>
> ```sh
> ORIGIN=https://cert.example.com node build/index.js
> ```

## Deploy notes

- Set a strong, stable `ORIGIN` when running behind a proxy so cookies/CSRF and
  the OAuth redirect use the correct scheme and host.
- Add `https://<your-domain>/auth/callback` as an authorized redirect URI in the
  Google Cloud Console.
- Register the site in [Google Search Console](https://search.google.com/search-console):
  add the property, verify with the HTML tag method, paste the token into
  `PUBLIC_GOOGLE_SITE_VERIFICATION`, then submit `https://<your-domain>/sitemap.xml`.
- Fonts: PDFs embed `static/fonts/SFProDisplay-*.ttf`. SF Pro is Apple's
  proprietary font; replace these files with an OFL-licensed font (Inter, Noto
  Sans, ...) before distributing certificates in production.

## Data & privacy

- Page images are stored in the browser (IndexedDB) and never uploaded to the server.
- Projects, sessions and user profiles are stored in the configured database.
