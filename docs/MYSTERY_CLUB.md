# Mystery Club, for the family

Open **Mystery Club** and choose one of the five illustrated case files. Tap **New Case**. Each person opens that same case on their own device and taps **Join this case**, then **I'm Ready**. When all three are ready, anyone can begin.

Each screen has a green section containing that person's private clues. Read them to each other or describe what you see. Shared evidence and puzzles appear below. Sometimes the case asks Mia to make a selection; Mom and Dad's clues help her choose.

To solve a puzzle, enter an answer, choose an option, match items, or arrange pieces. Ordering and picture puzzles support dragging, Move buttons, and selecting two pieces to swap, so a touchscreen or keyboard works too. A musical clue has a Play button and the same information written out; sound is optional.

**Ask Headquarters** gives two gentle nudges and then **Give Us the Answer**. Hints never reduce a score. When you solve a puzzle, read what you discovered and tap **Turn the page**. Everyone's case catches up automatically within about two seconds while their screen is visible.

You can close the website and return using **Continue Case**. Your joined profile, current scene, solved puzzles, and hints are saved. Your case notebook keeps earlier clues from your own screen. Readiness is a saved choice inside this case, not an online indicator. Nothing tracks where anyone is or when they last opened Home Base.

At the ending, the family gets a case-specific seal and a short summary. **Solved Cases** holds the completed memories. You can play a case again if you like. There are no family streaks, participation scores, or communication rewards.

## Parent case desk

Mom or Dad can confirm the separate administration key and import a new JSON mystery file. The app checks the file and lets a parent preview every scene as Mia, Mom, or Dad before publishing. Invalid files cannot be published. A parent can also unpublish a case to stop new games. Existing games and solved memories remain available.

The five launch files and an author guide are in `content/mysteries`. New mysteries use the same engine; adding one through the parent desk does not require rebuilding the website. When revising a file, increase its version number. Games already started continue with their original version.

## Cloudflare family setup

See [Cloudflare setup for Matt](CLOUDFLARE_SETUP_FOR_MATT.md). Workers hosts the app, D1 saves family content and game progress, and private R2 stores family media. The deployment process applies the fresh D1 migrations automatically. The historical PostgreSQL migrations are not part of this deployment.

Local tests use Cloudflare's isolated D1/R2 simulator and the production Workers build. The first live deployment still needs account setup and a family trial on the real iPad, phone and laptop. No extra AI or realtime account is needed.

## Visual review

`docs/reviews/mystery-club` contains screenshots of the case library, lobby, player-specific clue, shared puzzle, hints, and completed case on iPad, phone, and laptop.
