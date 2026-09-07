# Mystery Club, for the family

Open **Mystery Club** and choose one of the five illustrated case files. Tap **New Case**. Each person opens that same case on their own device and taps **Join this case**, then **I'm Ready**. When all three are ready, anyone can begin.

Each screen has a green section containing that person's private clues. Read them to each other or describe what you see. Shared evidence and puzzles appear below. Sometimes the case asks Mia to make a selection; Mom and Dad's clues help her choose.

To solve a puzzle, enter an answer, choose an option, match items, or arrange pieces. Ordering and picture puzzles support dragging, Move buttons, and selecting two pieces to swap, so a touchscreen or keyboard works too. A musical clue has a Play button and the same information written out; sound is optional.

**Ask Headquarters** gives two gentle nudges and then **Give Us the Answer**. Hints never reduce a score. When you solve a puzzle, read what you discovered and tap **Turn the page**. Everyone's case catches up automatically within about two seconds while their screen is visible.

You can close the website and return using **Continue Case**. Your joined profile, current scene, solved puzzles, and hints are saved. Your case notebook keeps earlier clues from your own screen. Readiness is a saved choice inside this case, not an online indicator. Nothing tracks where anyone is or when they last opened Home Base.

At the ending, the family gets a case-specific seal and a short summary. **Solved Cases** holds the completed memories. You can play a case again if you like. There are no family streaks, participation scores, or communication rewards.

## Parent case desk

Mom or Dad can confirm their own passcode and import a new JSON mystery file. The app checks the file and lets a parent preview every scene as Mia, Mom, or Dad before publishing. Invalid files cannot be published. A parent can also unpublish a case to stop new games. Existing games and solved memories remain available.

The five launch files and an author guide are in `content/mysteries`. New mysteries use the same engine; adding one through the parent desk does not require rebuilding the website. When revising a file, increase its version number. Games already started continue with their original version.

## Before live family testing

The website host must deploy this version and apply the new database update, `004_mystery_club.sql`, using the existing migration command. This adds Mystery Club's saved-game support to the same private database used by Messages and Family Board. Do not recreate your family or rerun the initial family seed on an existing database.

The launch collection appears automatically the first time someone opens the case library. No new account, AI service, paid realtime service, or media bucket is needed. The original illustrations and musical signals are built from the private case files. Existing Messages media storage is unchanged.

Whoever manages hosting should run `npm run db:migrate` with the existing private database settings, deploy the site, and check a case with all three real devices. Normal HTTPS hosting and database access remain necessary. The automated tests use an isolated test family; real-device sound, comfortable reading size, and the estimated playtimes still deserve a family trial.

## Visual review

`docs/reviews/mystery-club` contains screenshots of the case library, lobby, player-specific clue, shared puzzle, hints, and completed case on iPad, phone, and laptop.
