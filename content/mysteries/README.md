# Mystery Club content packages

The five numbered JSON files are the launch collection. They are original Home Base stories, not adaptations of franchise characters or plots. They are server imports, never files under `public/` or client imports.

| File | Case | Difficulty | Estimated time |
| --- | --- | --- | --- |
| `001-midnight-transmission.json` | The Midnight Transmission | Easy | 20–25 minutes |
| `002-unity-crown.json` | The Vanishing Unity Crown | Easy/Medium | 20–30 minutes |
| `003-moonlight-showcase.json` | The Missing Moonlight Showcase | Medium | 20–30 minutes |
| `004-starlit-journal.json` | The Starlit Ranger Journal | Medium | 25–30 minutes |
| `005-castle-of-five-keys.json` | The Castle of Five Keys | Medium/Hard | 30 minutes |

Times are estimates for a family reading and talking together; there is no countdown or performance score. A physical family playtest should calibrate them.

## Adding a case

Copy a package, give it a new `slug`, and author every shared and private clue, puzzle, hint, resolution, and ending. Keep `schemaVersion: 1`; increment `version` when revising an existing slug. Use **Parent case desk** in Mystery Club to confirm your passcode, import the JSON, validate, preview every player's view, and publish. Parents can unpublish a case to stop new games. Existing games and completed memories keep their own immutable case copy.

`mystery.schema.json` is the exported structural JSON Schema. The shared `validateMystery` function additionally checks scene reachability, cycles, references, unique IDs, complete permutations/matches, answer references, and exactly one final deduction. A validator cannot judge whether a story's clues are fair: use the walkthrough below and test with people before publishing a new case.

Run `npm run test:mysteries` to validate all five launch packages. Run `node --import tsx scripts/validate-mysteries.ts --schema` to regenerate the formal schema after an intentional schema change.

## Supported content

- Shared and Mia/Mom/Dad-specific notes, evidence cards, suspect cards, timelines, maps, and illustrations.
- Declarative illustrations with named objects on a bounded map/image; the engine draws them safely without accepting executable SVG or remote URLs.
- Original audio signals composed from named notes, with required written clues. Sound begins only when Play is chosen, stops on navigation, and has a silent text alternative. Arbitrary audio-file uploads are not part of this import format.
- Code entry (numeric, alphanumeric, phrase; exact/case/whitespace rules), choices, ordering, matching, hotspots, picture-fragment assembly, ciphers (Caesar, substitution, letter-number), and multi-field combination locks. A choice puzzle can express a pattern/sequence question.
- Exactly three thematic hints per puzzle. The third tells the answer; it does not apply a score penalty or automatically skip the puzzle.
- One named game-specific achievement at completion. No communication points, streaks, or family ranking.

## Author's walkthrough — spoilers

### The Midnight Transmission

1. Repair LOOK, AT THE, and THIRD STAR, then Mia selects Star 3. The filing order and sentence order are distinguished explicitly to make the specification's torn strips fit grammatically. Preserve `TH__D`, `L__K`, `_T THE`, the original filing order, and the star-vowel key.
2. Combine the star's 8 with 8:03→8:14 (11 minutes) and 8:14→8:27 (13 minutes): **8 / 11 / 13**. This is three number fields, never a three-digit code.
3. Left side plus off the floor identifies the **Dixie portrait**. Only Mia receives the room picture and interaction.
4. Moon M, star A, key P, owl as pointer: **MAP**.
5. Not near water, west of tower, outside forest: **Old Observatory**.
6. Put the two eyes/ears above the two curved belly fragments; match outer edges and central beak. Reading order is fragments **2 / 4 / 3 / 1**.
7. The cabinet invitation and case-delivery envelopes identify the owl as **the Mystery Club messenger**. Max and Dixie remain humorous agents; the original welcome letter closes the case.

### The Vanishing Unity Crown

1. Mia's leaf symbol plus Mom's room directory leads to **Greenhouse**; Dad confirms it names a place, not a suspect.
2. **Elara / ribbon; Bram / ink; Tavi / compass**.
3. **Ribbon (6:05), ink (6:12), key test (6:18), chime (6:20)**.
4. Alphabet positions **21 / 14 / 9 / 20 / 25 → UNITY**.
5. Three separate seal counts: **4 / 6 / 2**.
6. Unbroken glass, the exact chime time, and the ceremony book show that **Elara's thank-you chime activated an old ceremony**. The crown honored the unseen lantern makers; the witch-descended student is not a convenient culprit.

### The Missing Moonlight Showcase

1. Repeat gold / blue / gold / green: **Gold** comes next.
2. C4 / E4 / G4 rises with equal beats: **Firefly Fizz**. The written transcript has identical information to the sound.
3. **Juniper / Otter Cabin; Pip / Reed Dock; Lumi / Moth Cabin**.
4. South of Otter, west of stage, a building but not a cabin: **Archive Hut**.
5. **Recording (7:05), safety copy (7:12), private setting (7:18), missing report (7:25)**.
6. Combine Mia’s place **COVE**, Mom’s rehearsal number **17**, and Dad’s band piece **FIZZ**, using Dad’s order: **COVE17FIZZ**. The file was hidden by an over-literal archive sprite after a surprise request, never deleted. The lights were a call to gather help. All bands share the finale.

### The Starlit Ranger Journal

1. **Station desk (8:10), talk begins (9:00), talk ends (9:25), rain warning (9:40)**.
2. **Deer / split hoof; Otter / webbed toes; Owl / bird toes**. Identify drawings on a sign; do not follow wildlife.
3. South of Cedar, west of Star Meadow, waterfall: **Lantern Falls**.
4. **120−85=35 / 85−60=25 / five large stars**.
5. Shift each letter of TUBS backward once: **STAR**.
6. **Return the journal by the marked trail, tell Fern, and leave the platform clean**. Ranger Moss protected it from rain; a broken signal bell caused the misunderstanding. No trail shortcuts or collecting souvenirs are required.

### The Castle of Five Keys

1. Round jewel, not a flower, Sea Court emblem: **Princess Nerine's pearl**. Receive OPEN.
2. Moon first, Tower last, Key immediately before Tower, Rose before Key: **Moon / Rose / Key / Tower**. Receive WITH.
3. **Lantern Duchess / Sun; Garden Prince / Leaf; Midnight Knight / Moon**. Receive THREE.
4. Teeth remaining **12−1=11**, teeth missing **10−7=3**, one cycle of **4** chimes. Receive HEARTS.
5. In room order: **OPEN WITH THREE HEARTS**. The final deduction is that the castle's rooms were designed for complementary observations. The attraction is theatrical and explicitly has a safe exit.
