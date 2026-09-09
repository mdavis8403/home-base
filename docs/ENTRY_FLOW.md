# Coming home

Open Home Base. The cottage fills the screen. Tap its front door, enter the family magic word, and choose Mom, Dad or Mia. There are no profile passwords or PINs. The family password never appears on the page. Use your own profile so messages, favorites, Board answers and Mystery clues belong to the right person.

Anyone who knows the family magic word can select any profile. This is a shared family trust model. Profile-specific visibility remains enforced for the selected session, but selecting a name is not a separate identity check.

## Cloudflare setup and separate administration key

See [Cloudflare setup for Matt](CLOUDFLARE_SETUP_FOR_MATT.md). The first deployment uses the fresh D1 schema with no individual credential columns. Initial family and optional administration secrets are supplied privately in the dashboard; setup stores salted hashes and never overwrites an existing family.

Mom and Dad enter immediately without a second password. Only sensitive settings ask for the separate **Administration key**: publishing cases, Board settings/prompts and revoking devices. It must be 12–256 characters, different from the family phrase, and grants permission for ten minutes on that parent session. Mia cannot use it. If it is missing, sensitive settings stay locked while entry, messages and games work.

Remove the setup secrets after first entry and retain a private recovery copy with the adults. Changing an initialization secret later does not reset the existing database hash. Ask Codex for help if a word is forgotten; do not recreate the database.

## Visual and browser review

Screenshots in `docs/reviews/entry` show the cottage, magic-word modal, profile choices and the first Home Base screen on iPad, laptop and phone. Browser checks cover the image-relative door coordinates, touch/click and keyboard access, dismissal, wrong passwords, one-tap profile selection, distinct sessions, and absence of profile credential fields. Media storage requirements are unchanged.
