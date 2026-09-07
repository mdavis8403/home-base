# Home Base

A private place for Mia, Mom, and Dad. **Foundation + Phase 1 Messages.**

`HOMEBASE_SPEC.md` is the authoritative specification. Read it in full before working on this project, followed by `AGENTS.md` and [the architecture guide](docs/architecture.md).

## What is ready

- Next.js App Router, React, strict TypeScript, Tailwind and custom design tokens.
- Responsive entrance, family navigation, home shell, Messages, Family Board and two clearly labeled placeholder sections, and parent settings foundation.
- PostgreSQL migration with family/profile/session tables and reserved future-feature tables.
- Family phrase → profile → passcode authentication; secure remembered devices; session expiry; logout; parent reauthentication and revocation of other devices.
- Mia as child; Mom and Dad as administrators. No public signup or default real-family credentials.
- Private S3-compatible media adapter with short-lived signed reads and a default-deny authorization service; a server-only story-provider interface.
- Installable PWA metadata, icons and generic offline shell. No private pages, APIs, or media in the service-worker cache.
- Unit/database integration tests and production-browser tests for phone, iPad and laptop.

Messages includes personal notes, photo/voice/video/drawing attachments, recipient selection, scheduling, unread state, private favorites, hearts, and archive filters. Family Board includes daily questions, private photo/drawing responses, automatic reveal, Past Boards, and parent prompts/preferences. Mystery Club gameplay and Our Story generation are **not implemented**. No global presence, online status, last-seen, location/GPS, analytics, or activity monitoring is implemented.

## For the family

See [SETUP_FOR_FAMILY.md](docs/SETUP_FOR_FAMILY.md). You do not need to understand the developer commands below. A website host and a private database still need to be connected before this becomes your family's working website. No paid services have been created.

## Local development

Requires Node.js 22 or newer, npm, FFmpeg (including ffprobe) for media inspection/tests, and PostgreSQL (the optional Docker Compose file supplies PostgreSQL 17).

```sh
npm ci
cp .env.example .env.local
docker compose up -d
```

Edit `.env.local` privately. Set an access phrase of at least 8 characters and a **different** passcode of at least 6 characters for each profile. The example database password is only for the localhost-only Docker development database. Never use it for a hosted database.

```sh
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. Seed creates exactly Mia, Mom, and Dad, with both parents as admins. It refuses to overwrite any existing family. After seeding, remove `FAMILY_ACCESS_PHRASE`, `MIA_PASSCODE`, `MOM_PASSCODE`, and `DAD_PASSCODE` from the setup environment. Only their salted hashes remain in the database. Keep the passcodes in a password manager, not source control.

`DATABASE_URL` and `APP_ORIGIN` remain necessary. `APP_ORIGIN` must match the exact browser origin, without a trailing slash. Use HTTPS on a hosted app; HTTP is accepted only for local development/testing. Secure cookies use `__Host-` names on HTTPS. Temporary device sessions expire after 12 hours; remembered sessions expire after 30 days, without sliding activity-based renewal.

## Verification

```sh
npm test
npm run typecheck
npm run lint
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

Or run `npm run check` after installing browser engines. Unit/integration tests run the real SQL migration against the PostgreSQL-based PGlite engine. Browser tests start the **production build** on ports 3100/3101 and a disposable loopback-only PGlite PostgreSQL socket on 54329. They run the migration twice (idempotency), the actual seed script, and real HTTP authentication. Test credentials are isolated fixtures, never production defaults. Browser tests use Chromium for laptop and WebKit with iPad/phone emulation. Two offline emulation checks are intentionally skipped in WebKit; offline caching is exercised in Chromium. Physical iPad installation still needs a final check on the hosted HTTPS app.

The production build uses Next's supported Webpack builder to avoid Turbopack's process/port restrictions in restricted development environments. Type checking and linting run separately. CI repeats all checks on pushes and pull requests. It also runs migrations and seeding against PostgreSQL 17.

## Production setup

Use a Node.js/container host that runs Next.js server routes, has ffprobe installed, and accepts 46 MB request bodies with a 20-second media-inspection window. A static-files-only host or a serverless endpoint with small upload limits is not sufficient. Connect a private PostgreSQL database using its TLS connection string. Use a migration/owner database credential only for setup; the running app needs `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on application tables, not schema-management privileges. Never expose database credentials or a database HTTP API to the browser. Add `APP_ORIGIN` as the exact HTTPS website address.

Run migrations and the one-time seed using the private setup environment. Enable database backups in your provider. Do not put setup credentials into a build command or public configuration. Keep runtime database and storage credentials in the hosting provider's **server-side secret settings**. There are no `NEXT_PUBLIC_` secrets.

For Messages and Family Board attachments: provision a **private** S3-compatible bucket, block public access, disable public listing, enable provider encryption at rest, and use a narrowly scoped server credential. Fill the S3 settings in `.env.example` on the server. Without storage, written notes work but media sends fail clearly and preserve the draft. Set FFPROBE_PATH if ffprobe is not on the server PATH. Configure private-bucket CORS for GET from the exact app origin if your provider requires it for media playback; never allow public reads. AI and real-time services are not needed yet.

See [docs/architecture.md](docs/architecture.md) for shared contracts, security rules and phase boundaries.
