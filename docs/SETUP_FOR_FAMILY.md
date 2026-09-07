# Getting your family's Home Base ready

The foundation is built, but it is not yet a live family website. The four main rooms are placeholders for the next phases.

You do not need to run commands or edit code. When you are ready to put it online, ask Codex to help you **connect hosting and a private database for Home Base**. Hosting is the service that keeps the website running; the database is the private place where profiles and future family content are saved. No service accounts or paid plans were created during Foundation work.

You will need to:

1. **Choose or sign in to a website-hosting account.** A service that supports Next.js, such as Vercel, can run this app. Connecting the existing `home-base` GitHub project lets it receive future updates.
2. **Choose or sign in to a PostgreSQL database account.** PostgreSQL is simply the type of database this app uses. Codex can help connect it privately and create the tables. Turn on the provider's backup option so the family's information can be recovered.
3. **Choose a family access phrase and three separate passcodes.** The phrase must be at least 16 characters, and each passcode at least 6 characters. Use different passcodes for Mia, Mom, and Dad. Mom and Dad both start with administrator permission. Enter these privately during setup, not in a public file or GitHub. Setup saves protected hashes, not the original passcodes. The temporary setup entries should then be removed.
4. **Confirm the website's final address.** Codex will add that address to the private host settings so sign-in is accepted only from your website. The live address must begin with `https://`.
5. **Open Home Base on each device.** Enter the family phrase, choose the person's profile, and enter their passcode. Leave “Remember this device” checked on that person's own device. It will remember them for up to 30 days. On a shared device, uncheck it and sign out when finished.

On the iPad, use Safari's Share menu and choose **Add to Home Screen** after the live website is ready. On a laptop, use the browser's install option if one is offered. Home Base also works in an ordinary browser tab.

A parent can use **Parent Settings** to confirm their passcode and sign out all other devices if one is lost or shared. Changing family names or passcodes in the app will be added later; those settings are intentionally placeholders now. Keep the original passcodes safely in a password manager. If one is forgotten before recovery controls are built, a parent will need help resetting it securely.

You do **not** need an AI account or photo/video-storage service for this phase. Those will be connected when the corresponding features are built.

The offline screen only explains that the internet is unavailable. It does not expose cached messages, stories, profiles, or other family content.
