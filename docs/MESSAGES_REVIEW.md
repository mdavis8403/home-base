# Messages is ready for visual review

These screenshots come from the actual production build, using fictional notes and isolated test profiles:

- [iPad inbox](review/messages-ipad.png)
- [Phone inbox](review/messages-phone.png)
- [Composer with a drawing](review/messages-composer.png)

## What is implemented

The personal-note inbox, text/photos/voice/video/drawings, one or two recipients or Everyone, Send Now/Send Later, unread state, hearts, private favorites, sender-filtered archive and sent/scheduled view.

The app uses Foundation authentication, D1 tables, server permissions, session-authorized private R2 media and existing design tokens. Scheduled content and attachments stay inaccessible to recipients until delivery. No presence, online status, last-seen, location or typing indicators were added.

## What still needs connecting

This is not yet a live family website. Follow [Cloudflare setup for Matt](CLOUDFLARE_SETUP_FOR_MATT.md) to connect Workers, D1 and private R2. Media inspection runs within Workers.

Unit tests use isolated local D1 and storage assertions; browser tests use real local R2, generated capture inputs and synthetic media files. The production application has no simulated database/storage fallback. Without storage, attachment sends explain the missing setup and retain the draft.

Physical iPad camera/microphone permission, installed-PWA behavior and real hosted storage transfers still need checking after deployment.

See [the family setup guide](SETUP_FOR_FAMILY.md). You do not need to edit code or run commands to review the screenshots.

## Verification

- 35 unit/database/media tests passed.
- Type checking, linting and the production build passed.
- 22 browser tests passed across laptop Chromium and iPad/phone WebKit.
- Two existing WebKit offline-emulation checks remain intentionally skipped; the offline-cache check passes in Chromium.
