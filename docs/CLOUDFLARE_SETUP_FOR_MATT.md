# Home Base on Cloudflare — what is actually deployed

Home Base is **live** at **https://mdhomebase.com**. The cottage door, the family magic word, Mom/Dad/Mia selection, Messages, Family Board, and Mystery Club all work in production. This document describes the real, current setup and the few things only you can do from the Cloudflare dashboard. There is normally nothing here you need to run.

Everything runs on the **Cloudflare Free plan**. You do **not** need Workers Paid for this three-person family app, and no paid feature is enabled.

## What is running

| Piece | Value |
| --- | --- |
| Hosting | Cloudflare Workers (OpenNext build of the Next.js app) |
| Worker name | `home-base` |
| Production address | `https://mdhomebase.com` (custom domain, HTTPS managed by Cloudflare) |
| Database | Cloudflare D1 — `home-base-db` (binding `DB`) |
| Private media | Cloudflare R2 — `home-base-private-media` (binding `FAMILY_MEDIA`) |
| Plan | Free |
| `workers.dev` / preview URLs | Disabled — the app answers only on `mdhomebase.com` |

The `wrangler.jsonc` in the repository is the source of truth for this configuration. Its production values are `APP_ORIGIN = https://mdhomebase.com` and `FAMILY_TIMEZONE = America/Chicago`.

## How deploys happen

Cloudflare **Workers Builds** is connected to the GitHub repository `mdavis8403/home-base`. Every push to the `main` branch builds with `npm run build:cloudflare` and deploys with `npm run deploy`, which applies any new D1 database migrations and then publishes the Worker. You do not deploy by hand.

The custom domain `mdhomebase.com` is attached to the Worker as a dashboard setting (Custom Domain). Deploys do not change or remove it.

## The private family values (secrets)

In **Workers & Pages → home-base → Settings → Variables and Secrets** there is one runtime **Secret**:

- `FAMILY_ACCESS_PHRASE` — the family magic word (currently the word your family uses to open the door). It is used **once**, the first time anyone enters, to create the family and store a protected hash. It is never shown in the app or committed to GitHub.

`ADMIN_ACCESS_KEY` is **optional** and is not set. Without it, the extra parent-only settings screen stays locked; ordinary entry and Mom/Dad/Mia selection are unaffected. You can add it later (a different phrase, at least 12 characters) if you ever want those settings.

Because the family was already created during setup, you may delete `FAMILY_ACCESS_PHRASE` from the dashboard if you like — the door keeps working from the stored hash. Keep your own private copy of the word. **Changing or removing the secret does not change the door word**; the word only changes if the family row is reset (see recovery).

## How the door works (so nothing surprises you)

1. Someone opens `https://mdhomebase.com` and taps the cottage door.
2. Home Base asks "What's the magic word?" and they type the family word.
3. On the first entry ever, the app quietly created the family and the three profiles (Mom, Dad, Mia) from the secret above. This has already happened.
4. The word is checked against the stored hash. If it matches, "Who's coming home?" shows Mom / Dad / Mia.
5. Choosing a profile signs that person in. There are **no individual PINs**. "Remember me" keeps that device signed in for 30 days; leaving it unchecked lasts 12 hours.

Sign-in requests are accepted only when they come from `https://mdhomebase.com`. (This same-origin check is what had to be corrected during deployment — see the note at the end.)

## Keep private media private

In **R2 → home-base-private-media → Settings**: the **Public development URL is disabled** and there are **no custom domains** on the bucket. Leave it that way. Photos, drawings, and recordings are served only through the signed-in Home Base app; the bucket is never public.

## Bindings to confirm if something ever looks wrong

In **home-base → Settings → Bindings**: `DB` → `home-base-db`, and `FAMILY_MEDIA` → `home-base-private-media`. These are set automatically from `wrangler.jsonc`.

## If you ever need to recover

Send these to Codex or Claude rather than doing them blind; they are here so the steps are on record.

- **The door word won't open the door.** Confirm the site is `https://mdhomebase.com` exactly, that the latest build succeeded, and that the `home-base` Worker's `APP_ORIGIN` reads `https://mdhomebase.com` (not a `workers.dev` address). An origin mismatch rejects the word before it is ever checked.
- **You want to change the family word.** The word lives as a hash in the `families` row, not in the secret. Changing it means resetting that row and letting the app re-create it from a new `FAMILY_ACCESS_PHRASE` — a deliberate, assisted step, not something to do casually. It does not require recreating the database or losing messages.
- **A build fails on D1 permission.** The Workers Builds API token needs **Account → D1 → Edit** in addition to its Workers and R2 permissions.
- **R2 problems.** Finish R2 activation if prompted; never enable public access to fix it.

## First-family acceptance checks (not infrastructure)

On each device, open `https://mdhomebase.com`, enter the word, pick your profile, and try: a photo or recording message, a scheduled note (it must stay hidden until its time), a Family Board response (others stay hidden until the evening reveal), and a Mystery Club game with all three profiles. On iPad, use Safari's **Share → Add to Home Screen** for an app-like icon.

---

*Deployment note (September 2026): during the migration the Worker was temporarily pointed at a `workers.dev` address for Free-plan validation, which made the same-origin check reject the real domain and stopped the magic word from working. The configuration now uses `https://mdhomebase.com` and `workers.dev` is disabled, so the door works normally. No paid Cloudflare feature was enabled at any point.*
