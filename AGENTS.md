# Home Base agent instructions

- Read `HOMEBASE_SPEC.md` in full before making changes. It is authoritative.
- No global presence system may be added: no online status, last-seen information, location/GPS tracking, or activity monitoring. Deliberate game-session participation is the sole scoped exception in the specification; never reuse it globally.
- Use the shared architecture in `src/lib`, the existing database migrations, and shared UI components. Do not invent parallel authentication, storage, permissions, database clients, or design systems.
- Secrets and API credentials must remain server-side. Protect server modules with `server-only`. Never put secrets in public environment variables, client bundles, logs, or committed files.
- Optimize the app for iPad, laptop, and phone. Preserve large touch targets, keyboard access, contrast, and reduced-motion support.
- Business logic must have tests, especially authorization and visibility rules. Run tests, type checking, linting, production build, and browser tests before completing changes.
- Phase 0 contains Foundation and placeholder screens only. Feature implementation requires the user's next-phase instruction. See `docs/architecture.md` for contracts and deferred work.
- Make schema changes through new migrations, not edits to applied migrations. Never use a profile ID from a request as the authenticated identity.
- Do not cache authenticated pages, API responses, or family media in the service worker.
