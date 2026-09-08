# Getting your family's Home Base ready

The foundation, Messages, Family Board, and Mystery Club are built. Live use still depends on connecting hosting, the private database, and media storage. Our Story remains a placeholder. See [the Mystery Club guide](MYSTERY_CLUB.md) for the five cases and the saved-game database update. See [the Family Board guide](FAMILY_BOARD.md) for private responses, reveal times, parent prompts, and the new database update.

You do not need to run commands or edit code. When you are ready to put it online, ask Codex to help you **connect hosting and a private database for Home Base**. Hosting is the service that keeps the website running; the database is the private place where profiles and future family content are saved. No service accounts or paid plans were created during Foundation work.

You will need to:

1. **Choose or sign in to a website-hosting account.** We will choose a service that supports this Next.js app, private media checks and video uploads. Connecting the existing `home-base` GitHub project lets it receive future updates.
2. **Choose or sign in to a PostgreSQL database account.** PostgreSQL is simply the type of database this app uses. Codex can help connect it privately and create the tables. Turn on the provider's backup option so the family's information can be recovered.
3. **Choose one family magic word.** It must be at least 8 characters. Mom, Dad and Mia have no individual passwords. If you want sensitive parent controls, choose a separate administration key of at least 12 characters and keep it with the adults. Setup stores protected hashes; remove the temporary setup entries afterward.
4. **Confirm the website's final address.** Codex will add that address to the private host settings so sign-in is accepted only from your website. The live address must begin with `https://`.
5. **Open Home Base on each device.** Tap the cottage door, enter the magic word, then tap Mom, Dad or Mia. You go straight in. “Remember me on this device” lasts up to 30 days; uncheck it on a shared device and sign out when finished.

On the iPad, use Safari's Share menu and choose **Add to Home Screen** after the live website is ready. On a laptop, use the browser's install option if one is offered. Home Base also works in an ordinary browser tab.

Sensitive parent settings ask for the separate administration key, never a profile password. Anyone who knows the family magic word can choose any profile, so choose your own name to keep notes and clues attributed correctly. If the administration key is forgotten, your hosting helper can replace it without changing profiles or family content. See [the entry setup guide](ENTRY_FLOW.md).

You do **not** need an AI account for Messages. Photos, voice, videos and drawings need a private storage account connected before they can be sent. Codex can help connect it and configure the server’s media checks; you do not need to install anything on your iPad. Until then, the app clearly explains that storage is not connected and keeps your draft. Written messages work once the private database is connected.

Messages lets each person choose a recipient (or Everyone), write a note, add a photo, recording or drawing, and send it now or schedule it. Scheduled times use the time zone shown on the device. Recipients cannot open the message or its attachments early. Open a note to mark it read, send a heart, or save it as a private favorite. Find older notes under Our keepsakes; find your outgoing notes under Sent & scheduled. Tap Refresh to check for deliveries while the page stays open.

The offline screen only explains that the internet is unavailable. It does not expose cached messages, stories, profiles, or other family content.
