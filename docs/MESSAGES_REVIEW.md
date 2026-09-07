# Messages is ready for visual review

These screenshots come from the actual production build, using fictional notes and isolated test profiles:

- [iPad inbox](review/messages-ipad.png)
- [Phone inbox](review/messages-phone.png)
- [Composer with a drawing](review/messages-composer.png)

## What is implemented

The personal-note inbox, text/photos/voice/video/drawings, one or two recipients or Everyone, Send Now/Send Later, unread state, hearts, private favorites, sender-filtered archive and sent/scheduled view.

The app uses Foundation authentication, PostgreSQL tables, server permissions, private media signing and existing design tokens. Scheduled content and attachments stay inaccessible to recipients until delivery. No presence, online status, last-seen, location or typing indicators were added.

## What still needs connecting

This is not yet a live family website. Real hosting, PostgreSQL and a private media bucket still need connecting. Media validation also needs the server-side ffprobe utility and a host that accepts video-size uploads.

Tests use an isolated PostgreSQL-compatible database, a fake private-storage adapter, generated audio/video capture inputs and synthetic media files. The production application has no simulated database/storage fallback. Without storage, attachment sends explain the missing setup and retain the draft.

Physical iPad camera/microphone permission, installed-PWA behavior and real hosted storage transfers still need checking after deployment.

See [the family setup guide](SETUP_FOR_FAMILY.md). You do not need to edit code or run commands to review the screenshots.

## Verification

- 35 unit/database/media tests passed.
- Type checking, linting and the production build passed.
- 22 browser tests passed across laptop Chromium and iPad/phone WebKit.
- Two existing WebKit offline-emulation checks remain intentionally skipped; the offline-cache check passes in Chromium.
