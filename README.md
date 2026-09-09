# Home Base

A private place for Mia, Mom, and Dad: Foundation, Messages, Family Board, and Mystery Club. Our Story remains a placeholder.

Read `HOMEBASE_SPEC.md`, `AGENTS.md`, and [architecture](docs/architecture.md) before changes. Preserve the cottage, shared family magic word, immediate Mom/Dad/Mia selection, and profile attribution. No individual PINs, global presence, location tracking, or engagement metrics.

## Cloudflare deployment

Home Base runs on **Cloudflare Workers with OpenNext**, **D1** for application data, and **private R2** for media. The existing Next.js UI and business services remain. The target production origin is `https://mdhomebase.com`.

Matt's dashboard-only instructions: [CLOUDFLARE_SETUP_FOR_MATT.md](docs/CLOUDFLARE_SETUP_FOR_MATT.md).

The repository does not deploy or change DNS merely by installing dependencies or running checks. GitHub Actions checks the code. Once deliberately connected, Cloudflare Workers Builds deploys `main` using `npm run build:cloudflare` and `npm run deploy`. The deploy script provisions the named D1/R2 resources through Wrangler and applies D1 migrations. No production account credentials are committed.

## Local development for Codex

Node.js 22 or newer and npm are sufficient. No Docker, PostgreSQL, FFmpeg, cloud login, or R2 access keys are required.

```sh
npm ci
npm run dev
```

On the first start, Codex supplies the intended family phrase privately as `FAMILY_ACCESS_PHRASE`; the launcher saves it in ignored `.dev.vars` with owner-only file permissions. Alternatively copy `.dev.vars.example` and fill it privately. `npm run dev` applies local D1 migrations and starts Next.js on `http://localhost:3101` with Cloudflare's binding simulator. Local D1/R2 data persists in ignored `.wrangler/state`. Subsequent starts need no setup. Do not delete that folder if local memories matter.

To test the actual production Workers runtime:

```sh
npm run build:cloudflare
npm run preview
```

The cottage's first successful family setup creates three profiles atomically from server-side settings. The family phrase is 8–256 characters; optional separate administration key is 12–256 and must differ. Existing families are never reseeded or overwritten. Setup values can be removed after initialization. Profile selection remains immediate. Sessions are fixed at 12 hours or 30 remembered days. See [entry flow](docs/ENTRY_FLOW.md).

## Checks

```sh
npx playwright install chromium webkit
npm run check
```

`check` runs unit/security/D1 tests, all five mystery validators, TypeScript, ESLint, the production Cloudflare build, and browser tests. Browser tests use isolated local Workers/D1/R2 on ports 3100 and 3101; stop the ordinary preview first. They apply migrations twice and exercise the real app APIs, three-player games, save/resume, entry, responsive layouts and private media. They never use a hosted database. Two WebKit offline-emulation cases remain intentionally skipped; Chromium verifies service-worker cache behavior.

## Shared contracts

- One server-only `Database` backed by D1 prepared statements and atomic batches. Fresh migrations are in `db/d1`. Historical `db/migrations` files are preserved as immutable PostgreSQL history and are **not** used for deployment.
- One `PrivateStorage` backed by an R2 binding. No public bucket or S3 keys. Media byte requests reauthorize the session and feature visibility each time, including range requests and scheduled messages.
- Mystery Club uses atomic D1 revision checks and the existing visible-page polling. Durable Objects were assessed and are unnecessary for the current three-person game. D1 remains the sole persistent source for lobbies, clues, progress, events and history.
- The PWA caches only the generic offline shell and icons. No authenticated pages, API data or private media are cached.

Feature guides: [Messages review](docs/MESSAGES_REVIEW.md), [Family Board](docs/FAMILY_BOARD.md), [Mystery Club](docs/MYSTERY_CLUB.md), and [case authoring](content/mysteries/README.md).
