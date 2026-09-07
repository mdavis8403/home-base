# Getting your family's Home Base ready

The foundation, Messages, and Family Board are built. Live use still depends on connecting hosting, the private database, and media storage. Mystery Club and Our Story are still placeholders. See [the Family Board guide](FAMILY_BOARD.md) for private responses, reveal times, parent prompts, and the new database update.

You do not need to run commands or edit code. When you are ready to put it online, ask Codex to help you **connect hosting and a private database for Home Base**. Hosting is the service that keeps the website running; the database is the private place where profiles and future family content are saved. No service accounts or paid plans were created during Foundation work.

You will need to:

1. **Choose or sign in to a website-hosting account.** We will choose a service that supports this Next.js app, private media checks and video uploads. Connecting the existing `home-base` GitHub project lets it receive future updates.
2. **Choose or sign in to a PostgreSQL database account.** PostgreSQL is simply the type of database this app uses. Codex can help connect it privately and create the tables. Turn on the provider's backup option so the family's information can be recovered.
3. **Choose a family access phrase and three separate passcodes.** The phrase must be at least 16 characters, and each passcode at least 6 characters. Use different passcodes for Mia, Mom, and Dad. Mom and Dad both start with administrator permission. Enter these privately during setup, not in a public file or GitHub. Setup saves protected hashes, not the original passcodes. The temporary setup entries should then be removed.
4. **Confirm the website's final address.** Codex will add that address to the private host settings so sign-in is accepted only from your website. The live address must begin with `https://`.
5. **Open Home Base on each device.** Enter the family phrase, choose the person's profile, and enter their passcode. Leave “Remember this device” checked on that person's own device. It will remember them for up to 30 days. On a shared device, uncheck it and sign out when finished.

On the iPad, use Safari's Share menu and choose **Add to Home Screen** after the live website is ready. On a laptop, use the browser's install option if one is offered. Home Base also works in an ordinary browser tab.

A parent can use **Parent Settings** to confirm their passcode and sign out all other devices if one is lost or shared. Changing family names or passcodes in the app will be added later; those settings are intentionally placeholders now. Keep the original passcodes safely in a password manager. If one is forgotten before recovery controls are built, a parent will need help resetting it securely.

You do **not** need an AI account for Messages. Photos, voice, videos and drawings need a private storage account connected before they can be sent. Codex can help connect it and configure the server’s media checks; you do not need to install anything on your iPad. Until then, the app clearly explains that storage is not connected and keeps your draft. Written messages work once the private database is connected.

Messages lets each person choose a recipient (or Everyone), write a note, add a photo, recording or drawing, and send it now or schedule it. Scheduled times use the time zone shown on the device. Recipients cannot open the message or its attachments early. Open a note to mark it read, send a heart, or save it as a private favorite. Find older notes under Our keepsakes; find your outgoing notes under Sent & scheduled. Tap Refresh to check for deliveries while the page stays open.

The offline screen only explains that the internet is unavailable. It does not expose cached messages, stories, profiles, or other family content.
