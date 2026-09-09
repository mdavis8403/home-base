# Cloudflare migration review

The existing Next.js UI remains intact. No production deployment, cloud resources or DNS changes were performed by Codex. Account-specific setup is in [Cloudflare setup for Matt](CLOUDFLARE_SETUP_FOR_MATT.md).

## Infrastructure

- OpenNext builds the existing Next.js app for Workers. The installed versions are checked against the adapter's peer range and locked in npm.
- D1 replaces PostgreSQL, including schema, atomic message writes, Board reveal and revision-checked Mystery events. The historical PostgreSQL migrations are preserved and unused.
- Private R2 replaces the S3 credential configuration. Every media byte/range request rechecks session and feature permissions. No public R2 URL is used.
- Media inspection runs in Workers without ffprobe. A synthetic valid 32 MB MP4 was accepted in the actual local Workers runtime, verifying the existing upper video size boundary.
- Durable Objects are intentionally not configured: D1 concurrency plus existing visible-game polling meets the current three-player requirements without a second coordinator. No global presence was added.
- Local development retains persistent D1/R2 without cloud login. CI uses disposable D1/R2 and the real Workers build.

## Compatibility issue found and fixed

Workers static assets ordinarily redirect `/offline.html` to an extensionless URL. That makes a cached redirected response unsuitable as an offline navigation fallback. The configuration explicitly sets `assets.html_handling` to `none`, preserving the original offline page URL and PWA behavior.

R2 can report range metadata even for a full object read. The byte route sends `206 Partial Content` only when the client requested a range; ordinary downloads return `200 OK`. Browser tests assert both behaviors.

## Acceptance scope

Automated checks cover family authentication and distinct profiles, fixed sessions, administrative grants, D1 foreign keys, concurrency/retries, scheduled media, favorites/hearts, Board privacy and both reveal conditions, timezone/DST, private media history, all five cases with three players, reconnect/save/resume, import validation and publication, iPad/phone/laptop layouts, and PWA metadata/offline privacy.

Account billing/permissions, real Cloudflare provisioning, the HTTPS certificate/domain, physical microphone/camera permissions, and Add to Home Screen remain first-live-deployment acceptance. Our Story remains the existing placeholder.

## Verification results

- 64 unit, database, authentication and business-rule tests passed against local D1.
- All five bundled Mystery Club packages passed validation.
- Type checking, linting and the production Next.js/OpenNext Workers build passed.
- The complete browser suite exercised 63 cases: 60 passed initially, two WebKit offline-emulation cases were intentionally skipped, and one Chromium offline test exposed the static-asset redirect issue above. After the fix, all 34 rerun entry, Board, media and shell checks passed, with those same two intentional skips. All 61 non-skipped cases have passed; no failing case remains.
- All five mysteries completed with three simulated family members on laptop, iPad and phone, including save/resume checks. Private R2 checks cover photos, drawings, voice, video, scheduled visibility, revoked sessions, ranges and Past Boards.
- After the final full-download status fix, all six private-media browser tests passed again across laptop, iPad and phone; type checking, linting and the Workers build also passed again.
- Ordinary `npm run dev` successfully initialized local family entry, created a remembered profile session, saved a message in D1 and uploaded a private photo to R2. After stopping it and starting `npm run preview`, the same session, message and exact photo bytes survived. Local migrations require no interactive confirmation, and startup preserves `AGENTS.md` unchanged.
- A deployment dry run recognized the Worker, D1 and R2 bindings without creating cloud resources. The compressed Worker bundle was approximately 1.3 MB.
- Updated visual reviews are in `docs/reviews/entry`, `docs/reviews/family-board` and `docs/reviews/mystery-club`. The iPad password prompt and phone revealed Board were visually inspected; the supplied cottage artwork and UI design remain unchanged.
