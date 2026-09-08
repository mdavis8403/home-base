# Coming home

Open Home Base. The cottage fills the screen. Tap its front door, enter the family magic word, and choose Mom, Dad or Mia. There are no profile passwords or PINs. The family password never appears on the page. Use your own profile so messages, favorites, Board answers and Mystery clues belong to the right person.

Anyone who knows the family magic word can select any profile. This is a shared family trust model. Profile-specific visibility remains enforced for the selected session, but selecting a name is not a separate identity check.

## Updating an existing website

Your hosting helper should deploy this version with `npm run db:migrate`. Migration 005 removes old profile credential hashes while preserving the family, profile IDs and all content. Old administrative grants and unfinished entry challenges are cleared. Existing normal sessions retain their fixed expiry. Do not rerun the family seed or recreate the database.

Normal entry uses the existing family-password hash. For a fresh setup, provide the intended family magic word privately through `FAMILY_ACCESS_PHRASE` and run the normal seed. Never place a real password in a committed file.

## Separate administration key

Mom and Dad can enter normally without another password. Only sensitive settings ask for an **Administration key**. This is a separate family administration credential, not a profile password. It protects publishing cases, changing Board settings/prompts and revoking devices. It grants permission for ten minutes on that parent session. Mia sessions cannot use it.

Your hosting helper can choose a separate 12–256 character key, different from the family phrase, and supply it privately as `ADMIN_ACCESS_KEY`. For a new family the seed stores its salted hash. For an existing family, run:

```sh
node --env-file=.env.local --import tsx scripts/set-admin-key.ts
```

Remove the key from the setup environment afterward and keep it in the adults’ password manager. Running this setup command again replaces the key and clears prior administrative grants. If no key is configured, sensitive settings stay locked, while entry, messages and games still work. No individual profile password is retained or reused.

## Visual and browser review

Screenshots in `docs/reviews/entry` show the cottage, magic-word modal, profile choices and the first Home Base screen on iPad, laptop and phone. Browser checks cover the image-relative door coordinates, touch/click and keyboard access, dismissal, wrong passwords, one-tap profile selection, distinct sessions, and absence of profile credential fields. Media storage requirements are unchanged.
