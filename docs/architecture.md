# Foundation contracts

Authority: `HOMEBASE_SPEC.md`. Scope: Foundation contracts and the Phase 1 Messages and Family Board extensions below. One shared foundation; no parallel systems.

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

## Phase 1: Messages (implemented)

Messages is the first authorized feature. Family Board is implemented in the extension below; Mystery Club and Our Story remain placeholders.
The existing authenticated route group now has a concrete `/messages` page.
`MessagesService` uses the Foundation database, session permissions, reserved tables,
private storage adapter and media-signing service. Migration 002 adds only recipient
hearts and media/sender indexes.

- GET `/api/messages` returns delivered recipient messages; `?view=sent` returns the sender's own notes, including scheduled ones. Favorites/read state is joined only for the authenticated recipient. Read times and favorite times are never returned; deliberately sent hearts include names.
- POST `/api/messages` accepts a strict message DTO, an idempotency UUID, profile keys for recipients, optional future ISO delivery instant and one optional media attachment (with optional accompanying text). The server resolves keys within the session family; the sender is never taken from input. Everyone includes the sender. Two-person choices exclude the sender.
- A single SQL CTE atomically inserts the message, recipients and asset metadata. Storage uploads precede that transaction; a database failure triggers removal. Retrying the same UUID cannot duplicate delivery.
- POST `/api/messages/:id` sets read, favorite or heart state only on the active recipient's delivered message. Values are explicit and retry-safe.
- GET `/api/messages/media/:assetId` loads the canonical database asset, then applies exact family/entity membership and delivery authorization through `MediaService`. Only the sender can view a scheduled attachment early. Being a parent does not bypass recipient privacy. Links expire in 60 seconds and bypass Next image optimization; storage responses are private/no-store.
- No delivery worker is needed: PostgreSQL `now()` controls visibility each fetch. The inbox refreshes when the window regains focus or Refresh is tapped. No global presence, heartbeat, typing or activity records are created.
- Scheduling uses the device's explicitly displayed timezone and sends a UTC instant. Voice/video descriptions support transcripts and text alternatives. Native browser recording starts only after Record; tracks stop on stop, error, discard and unmount.
- Recordings are capped at 5/2 minutes and video recording targets 1.2 Mbps. Upload caps are 8 MB images, 12 MB audio, 32 MB video. JSON is streamed with a 46 MB cap only for the message send endpoint (base64 overhead); existing auth limits stay 4 KB.
- Actual media inspection uses server-side **ffprobe** (from FFmpeg), requiring a host with that executable or `FFPROBE_PATH`. It checks container, codecs, file signatures and actual durations/packet timestamps; it rejects unsupported formats and overlong files. Allowed demuxers and protocols are restricted. Temporary files are removed in a finally block. Media fails closed if inspection/storage is unavailable; text remains usable.
- The host/reverse proxy must permit 46 MB requests and at least the 20-second inspection window. Choose a Node/container host supporting those limits; a small serverless request-body limit will not accommodate this upload path.
- No production mock repository or storage fallback is installed. Automated tests use isolated PGlite plus a fake private-storage adapter for signing/upload assertions; browser tests run real Foundation authentication against an isolated database. Real media fixtures exercise byte/duration validation. Chromium runs native MediaRecorder with generated audio/video input streams because the headless test host does not support capture hardware; permission denial is tested separately. Physical-device microphone/camera permissions and live S3 round trips remain deployment acceptance checks.
- Parent deletion controls remain part of the deferred Parent Settings work. Messages have no user deletion action and remain in the archive.

## Phase 1: Family Board (implemented)

Family Board is the second authorized feature. Mystery Club, Our Story, the opening-door experience, and home prioritization remain outside this task.

`BoardService` reuses Foundation sessions, permissions, `database()`, reserved board tables, `MediaService`, S3 storage, and Messages' actual-byte media inspector. Migration 003 adds board preferences, prompt categories and built-in identifiers, indexes, and two transactional PostgreSQL functions. There is no browser database access.

- `POST /api/board/open` creates today's board if missing. A family row lock serializes simultaneous opens. All reads use the family's timezone. Sixteen age-appropriate prompts cover all three activities and four categories; least-recently-used selection gives unused custom prompts priority. No empty boards are invented for days nobody opened the room.
- `GET /api/board` is read-only. SQL returns only the signed-in member's response before reveal, even for parents who have already answered. Other response text, names, asset IDs and metadata never enter the payload. After reveal, every submitted response is returned together. No participation counts or missing-person indicators are returned.
- Reveal is `revealed_at IS NOT NULL OR reveal_at <= statement_timestamp()`. The third unique response sets `revealed_at` in the same transaction. A board row lock serializes concurrent responses. The time-based reveal needs no worker or scheduler; all readers apply the same database clock. The visible room refreshes every 10 seconds and on focus, without writing presence or activity records. This gives an open browser up to 10 seconds of display latency after a reveal.
- `POST /api/board/respond` derives identity only from the current session. Exactly one immutable response per member per board; duplicate retries succeed without replacement. Questions require text; photos/drawings require exactly one matching inspected image. Media upload precedes the atomic asset/response transaction; duplicate and failed writes remove the unused uploaded object. One member may add a late response to today's revealed board; it appears immediately. Past boards cannot receive new responses.
- `GET /api/board/media/:id` uses the canonical asset and response relationship plus the same reveal rule before signing a 60-second private read URL. Parents never bypass early media privacy. The endpoint shares Messages' storage adapter, and uses a 12 MB streamed request cap for image uploads (8 MB actual file maximum).
- `POST /api/board/prompt` requires fresh `content:manage`; `/settings` requires fresh `family:manage`. Both use the existing parent passcode endpoint. Strict schemas reject submitted identities, unknown fields, empty category selections and invalid times. Settings and custom prompts apply to the next new daily board; an existing board's reveal instant and prompt are fixed.
- Default reveal time is 20:00 in `families.timezone`. PostgreSQL converts each local board date and clock time to a UTC instant, including daylight-saving offsets. In a spring-forward gap it uses the standard-time interpretation (the skipped time moves forward); an ambiguous autumn time uses the later standard-time occurrence. Family timezone editing remains deferred to the existing family-management phase.
- Past Boards is a newest-first archive with question answers and private signed photo/drawing views. Parent custom prompts and preferences are in Family Board → Parent touches, linked from Parent Settings.
- Drawing Challenge directly reuses the Messages `Doodle` component and its tools. A drawing-file picker provides a keyboard-accessible alternative to freehand canvas input. The optional 60-second timer begins on Start timer, may be disabled, and never submits, discards, or locks a drawing. Its end is a gentle cue; the family can keep drawing.

Validation includes actual PostgreSQL-engine migrations and service tests for cross-family/expired-session denial, parent reauthentication, pre-reveal DTO and media privacy, all-three/timed reveal, concurrent and duplicate responses, archived boards, prompt rotation, timezone and daylight-saving conversion, real image inspection, and upload/database failure cleanup. Production browser tests exercise real authentication and three clients on Chromium and WebKit iPad/phone, including automatic reveal, archive navigation, parent settings, photo preview, the shared canvas, and optional timer. Live S3 round trips and physical-device acceptance remain hosting work; no application fake storage or test routes were introduced.
