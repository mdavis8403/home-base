# Foundation contracts

Authority: `HOMEBASE_SPEC.md`. Scope: Phase 0 only. One shared foundation; no parallel systems.

## Boundaries

- `src/app`: Next.js routes; authenticated route group is `(family)`. Its layout checks the session and every data-reading page must also call `requireSession`. Every mutation checks the session and permission inside the route/service, independent of navigation visibility.
- `src/components`: reusable navigation, auth UI, parent-security UI, clubhouse SVG and PWA registration. Client code may import `src/lib/shared`, never `src/lib/server`.
- `src/lib/shared`: safe profile, session, permission, media and API types; initial identities; navigation and pure permission logic. No credential hashes are part of browser-facing profile types. Dates in `Session` are server-side Date values; add explicit serialization DTOs if a future API needs them.
- `src/lib/server`: `server-only` database client, crypto, auth service, HTTP protections, private storage and StoryProvider contracts. These are the exclusive entry points for later features.
- `db/migrations`: ordered, immutable SQL migrations. The migration runner uses a transaction, advisory lock and checksums. Add new migrations for feature-specific schema evolution.
- `scripts/seed.ts`: transactional, one-time, exactly three profiles. Credentials come from private setup settings; no default seed passwords. Both parents initially admin. The unique family/profile-key and role constraints prevent duplicate initial identities and child promotion. Future profile-management services must preserve three profiles and at least one admin.

## Authentication and authorization

1. `POST /api/auth/family` accepts `{ phrase }`, verifies its salted scrypt hash, sets a five-minute HttpOnly challenge cookie and returns safe profile metadata.
2. `POST /api/auth/profile` accepts `{ key, passcode, remember }`. Requires the challenge. Passcode is checked for that family, then challenge is consumed atomically. Database stores only hashes of random 256-bit session/device tokens. The authenticated identity is always derived from those cookies, never a requested profile ID.
3. Sessions have a fixed expiry: 12 hours (browser-session cookie) or 30 days (remembered). Both opaque cookies must match. No fingerprinting, sliding “last active” update, heartbeat, or activity timestamps. Reopening a valid device goes to `/home`. Signing in or out performs full navigation to discard client profile state.
4. `POST /api/auth/reauth` accepts `{ passcode }`, checks the signed-in parent's own hash and grants 10 minutes of sensitive permissions on this session only. Child profiles cannot reauthenticate as parents.
5. `POST /api/auth/sign-out` accepts `{}` and deletes the current session. `POST /api/auth/revoke-devices` accepts `{}` and requires freshly verified admin permission; deletes other family sessions while preserving the current device.

Every route returns `ApiResult<T>`: `{ok:true,data}` or `{ok:false,error:{code,message}}`, with `Cache-Control: no-store`. Exact same-origin checks, Fetch Metadata checks, strict SameSite cookies, JSON-only requests, body limits, strict Zod validation and no mutating GET routes provide the CSRF boundary. HTTPS uses Secure + HttpOnly + `__Host-` cookies. Local HTTP uses unprefixed HttpOnly cookies solely so localhost works.

Authentication attempts are database-backed fixed-window counters, shared by all server processes: 30 family-phrase attempts / 15 minutes; 10 profile-passcode attempts / 15 minutes; 10 parent reauthentication attempts / 15 minutes. They count successful and unsuccessful attempts. Counters use stable family/profile buckets and store no IPs or behavioral histories. Expired challenges/sessions are cleaned opportunistically during authentication. No memory-only limiter or cleanup daemon is required.

Permissions:

| Permission                          | Child | Parent | Admin | Fresh passcode |
| ----------------------------------- | ----- | ------ | ----- | -------------- |
| Family shell                        | Yes   | Yes    | Yes   | No             |
| View Parent Settings                | No    | Yes    | Yes   | No             |
| Family/content management, deletion | No    | Yes    | Yes   | Yes            |
| Authentication/provider management  | No    | No     | Yes   | Yes            |

Only settings viewing, reauthentication, logout and device revocation are implemented. Other grants are shared contracts for future server services. Always reload the session for each request; do not trust a session object supplied by a browser. Use `AuthService.require` plus entity/family-specific checks.

## Data access

One private PostgreSQL database, accessed through `database()` and parameterized SQL. No browser database client, no exposed REST database, no implicit client-side authorization, no public signup. Family-scoped composite foreign keys prevent cross-family relations in reserved tables. Database credentials must be server-only; a hosted provider's public data API must remain disabled/inaccessible. This foundation uses server authorization rather than pretending an unconfigured RLS policy secures a publicly exposed database.

All conceptual entities in specification section 15 are reserved; `story_participants` additionally represents membership/turn order explicitly. Reserved JSON fields are opaque until their feature validators exist. There are no feature data APIs or populated feature rows. Indexes cover initial session and expected inbox lookups; features add their own migrations and indexes when behavior is known. Polymorphic media entity references will require server validation against the actual related row.

## Private media

`PrivateStorage` abstracts signing, server upload, and removal. `S3PrivateStorage` uses private object keys and server-only provider credentials. `mediaPath` is `family/{uuid}/{messages|board|stories}/{entityUuid}/{assetUuid}`; it rejects path traversal. Object keys are not public URLs. `MediaService.readUrl` checks session expiry, family scope, exact asset key and a server-side feature access policy before issuing a 60-second signed URL. Default policy denies everyone, including owners and admins.

No media HTTP routes are installed in Phase 0. Later feature services must look up assets from the database, validate access to the related entity, and use the shared service. Do not accept asset records or authorization flags supplied by clients. Message policies must enforce recipient membership and delivery time; board policies must enforce reveal rules; game policies must enforce player-specific information. Owning an asset or being in the family does not automatically grant read access. Features must validate actual file types, sizes, duration, alt text/transcripts and upload limits before using the low-level server `put` method. No public upload URL, arbitrary object-path API, or unsigned media URL is allowed.

`StoryProvider` is only a server-only extension interface. No model calls, story behavior, prompt, or keys are configured. Story validation/safety behavior belongs to Phase 1.

## PWA and design

Warm navy, cream, coral, gold and green tokens; centered layouts; four primary destinations without a desktop sidebar. Large controls, visible keyboard focus, descriptive headings, reduced-motion support. The entrance has no blocking animation. Home is a truthful shell; future priority cards contain no invented unread counts or activity.

Manifest includes 192/512 PNG icons, a maskable icon, standalone display and launch colors; Apple touch icon and web-app metadata are provided. Splash behavior follows each device's installed-PWA implementation. Full offline play is out of scope. Service worker only precaches generic offline HTML and icons. Navigations are network-only with a generic offline fallback; no private response is put in Cache Storage. No push subscription or notifications yet. Geolocation, camera and microphone are denied via Permissions-Policy in Phase 0. Later recording features may enable camera/microphone deliberately; geolocation stays disabled.

## Verification and next phase

Vitest runs security/business rules plus actual migration queries using PGlite's PostgreSQL engine. Playwright starts two production servers (unconfigured and configured) and tests real authentication using an isolated PostgreSQL socket and the actual migration/seed scripts. Chromium laptop and WebKit iPad/phone projects cover the public shell, private redirects, profile identity, placeholders, child denial, parent verification and revocation. Chromium checks the offline cache. CI additionally exercises setup on PostgreSQL 17. Hosted TLS/storage configuration and installation on physical family devices remain deployment acceptance work.

Next feature work must build on these contracts. Phase 1 implements Messages, Family Board, Mystery Engine, mystery content and Our Story only when requested. Mystery validators, puzzles, reveal/scheduled visibility, story turns and all related feature tests are deferred alongside their features. Session-specific game `joined_at`/`ready` fields are reserved only; there is no realtime or global presence service. Do not implement global online status, last-seen, location, GPS or activity monitoring in any future phase.
