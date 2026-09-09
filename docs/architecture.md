# Home Base architecture

Authority: `HOMEBASE_SPEC.md`. Foundation, Messages, Family Board, Mystery Club and cottage entry are implemented. Our Story and home prioritization remain deferred. Preserve one shared architecture and no global presence.

## Cloudflare compatibility decision

As checked September 8, 2026, Cloudflare recommends Vinext for new Next.js migrations and continues documenting the OpenNext adapter. Home Base keeps its existing Next.js 16 App Router and build semantics with `@opennextjs/cloudflare` 1.20.6, whose peer range explicitly supports the installed Next version. This minimizes UI/runtime change. The production artifact is exercised in workerd, not just `next start`. Wrangler and the matching Miniflare simulator are locked by `package-lock.json` (Wrangler currently ships Miniflare 5's alpha-tagged internal configuration API; tests use its provided v4 configuration converter).

References: [Cloudflare OpenNext](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/), [current Next.js recommendation](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/), [Node crypto support](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/).

## Shared boundaries

- `src/app`: Next routes, authenticated `(family)` layout and page-level `requireSession`. Every API repeats authorization independently of navigation visibility.
- `src/components`: existing warm Home Base design system, entry, navigation, Messages drawing/recording, Board and Mystery UI. No cloud credentials or database imports in client components.
- `src/lib/shared`: safe DTOs, identities, permissions, strict schemas and pure puzzle contracts.
- `src/lib/server`: exclusively server-only binding access, D1 adapter, crypto, auth, private R2, media inspection and feature services. Cloudflare request context supplies bindings; never cache a request binding globally.
- `db/d1`: fresh SQLite-compatible D1 schema, composite family foreign keys, indexes and atomic triggers. Add migrations for subsequent schema changes. Historical PostgreSQL files in `db/migrations` are immutable reference only; disposable local PostgreSQL data is not migrated.

## Authentication

Cottage → magic-word modal → brief light transition → Mom/Dad/Mia → Home Base. No individual credentials. The family secret proves shared family access; selecting a profile is attribution, not an independent identity proof.

`POST /api/auth/family` verifies the existing salted scrypt scheme and issues a five-minute opaque challenge. `POST /api/auth/profile` accepts only a key and remember boolean, resolves it within the challenge family, and atomically consumes the challenge. Session identity thereafter comes only from two matching opaque cookies, stored as hashes. Temporary sessions last 12 hours and remembered sessions 30 days. No sliding timestamps, IP collection or background activity writes.

Same-origin/Fetch Metadata/JSON checks, strict validation, bounded bodies, HttpOnly/SameSite cookies and HTTPS `__Host-` cookies remain. Rate counters in D1 retain 30 family entries and profile selections per 15 minutes, and 10 administration attempts. Responses are no-store. Normal Mom/Dad entry never requires a PIN. Sensitive settings require the distinct family administration key and a ten-minute parent-session grant; children and missing keys fail closed. Revoking other devices retains the current session.

First setup uses Worker secrets, not browser input: `initializeFamily` creates the family and three profiles in one D1 batch and stores only salted hashes. Concurrent setup is idempotent; existing credentials and content are untouched. No public signup/setup endpoint exists. Remove the setup secrets after the first successful entry. Keep a recovery copy in the adults' password manager. The offline `scripts/set-admin-key.ts` helper supports deliberate D1 admin-key recovery (local by default, explicit `--remote` for production); a D1 trigger atomically clears prior administrative grants when the key changes. It never runs during deployment.

## D1 transactions and dates

The shared `Database` maps parameter placeholders to D1 prepared bindings and encodes dates as UTC ISO strings. JSON and boolean DTOs are explicitly decoded at this boundary. It does not translate PostgreSQL SQL at runtime. D1 `batch` rolls back all statements on failure; conditional inserts and SQLite triggers enforce the important concurrency boundaries without process-local locks.

Messages insert with a unique write token. The same atomic batch creates recipients and attachment metadata only for that winning insertion. Concurrent retries cannot duplicate recipients or attach an extra object. Failed/losing media writes remove their unused R2 object. Inbox reads, recipient changes and media authorization all enforce delivery against SQLite's UTC clock; the sender alone may see a scheduled outgoing attachment early. Favorites/unread data remain per recipient; only deliberate hearts identify other recipients. Everyone includes the sender.

Board creation uses one conditional `INSERT ... SELECT`, a unique family/date key, the existing 16 prompts and least-recently-used ordering. Unused custom prompts get priority. Temporal converts the family calendar/timezone to a fixed UTC deadline, with the later autumn overlap and forward spring gap interpretation. Preferences apply to the next Board. Reads return only the current profile's response before reveal, including for parents. The third unique response triggers reveal in the response transaction. The deadline is also applied on every read, so timed reveal requires no cron. Responses and media metadata commit together, duplicates cannot replace answers, and old boards remain archived. Visible screens refresh every ten seconds.

## Private R2 media

`FAMILY_MEDIA` is a private R2 binding; no public R2 URL, custom media domain, access-key pair, or CORS rule is needed. Public cottage/PWA art remains in `public`.

The existing `MediaService` still checks session expiry, family, canonical object path and feature policy. Its internal read-URL contract returns an authenticated same-origin byte route. The existing 60-second refresh hint remains for the UI, but the URL grants no bearer access: **every byte or range request rechecks the live session and scheduled/reveal policy**. Revocation therefore takes effect immediately on subsequent requests. `Cache-Control: private, no-store`, `Vary: Cookie` and `nosniff` apply. Private media bypasses Next image optimization and the service worker.

The Workers-compatible inspector replaces external ffprobe: image-size identifies raster dimensions, and bounded structure checks reject incomplete PNG/JPEG/WebP files. Mediabunny parses approved audio/video containers and codecs and walks encoded packets to enforce actual duration, including recordings without duration headers. No shell, subprocess, remote fetch, or temporary media file is used. Limits remain 8 MB photos/drawings, 12 MB audio, 32 MB video and five/two-minute recording durations. Upload failure retains the draft and no delivered record. Physical microphone/camera permission and playback still warrant family-device acceptance on HTTPS.

## Mystery Club synchronization decision

D1 is the sole authority for installed/published packages, frozen per-game snapshots, lobby membership/Ready choices, current scene, hints, solved puzzles, event IDs, completed history and achievements. A conditional event insertion requires the expected revision; an atomic trigger updates membership, revision and progress. Conflicting requests cannot skip scenes. Repeated IDs are idempotent. Authorization/reducer logic stays in the existing service; only the current player's permitted clues and requested hints reach their browser. Parent author preview requires a fresh administration grant.

No Durable Object is configured. The current three-player, two-second visible-page polling is already supported by atomic D1 state and survives reconnect without an in-memory coordinator. Adding a Durable Object would duplicate coordination without a required latency benefit. If future gameplay needs push events, add one per explicitly joined game, keep D1 for long-term state, and never introduce global presence. Current Ready/Joined state is a saved intentional choice, not online status.

## Hosting, local development and PWA

Workers Builds watches GitHub `main` after Matt deliberately connects it. `wrangler.jsonc` declares D1/R2 auto-provisioning and exact production origin, and disables workers.dev/preview URLs and application request logs. The deploy script runs Wrangler then applies D1 migrations; first deployment remains inaccessible until the custom domain is added. Subsequent migrations must be backward-compatible because deployment and migration are sequential. Custom-domain attachment is a deliberate dashboard step, not an automatic DNS change from this migration.

Local development uses Next plus OpenNext's binding simulator; production preview uses Wrangler/workerd. Both persist local data. Browser tests have separate disposable local D1/R2, apply migrations twice, and use real cookies and HTTP routes. Unit tests run D1 in Miniflare rather than a SQL mock. GitHub Actions runs the complete check without Cloudflare account credentials.

Manifest, standalone display, Apple icon, responsive touch targets, keyboard support, reduced motion and existing artwork remain. The service worker caches only generic offline HTML/icons; private routes are network-only. No global online status, last seen, location, typing indicators, analytics, or activity monitoring is added. Platform-level billing diagnostics are distinct from app behavior and are not surfaced as family activity.
