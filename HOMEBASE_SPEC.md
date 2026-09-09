# HOME BASE
## Product Blueprint and Authoritative Build Specification

**Version:** 1.0  
**Status:** Authoritative MVP specification  
**Primary users:** Mia, Mom, Dad

---

# 1. PRODUCT VISION

Home Base is a private family web app designed to help a family stay connected when they are physically apart.

It is not primarily a messaging app, game platform, social network, or family organizer.

It is a shared digital place that belongs to the family.

Home Base combines four core experiences:

1. **Home Base Messages**  
   Personal notes, photos, voice messages, videos, and drawings exchanged privately between family members.

2. **Mystery Club**  
   Cooperative online mysteries in which each player receives different clues and the family must communicate to solve the case together.

3. **Our Story**  
   Collaborative AI-assisted storytelling in which family members take turns making decisions that shape an ongoing story.

4. **Family Board**  
   Lightweight shared activities including questions, photo prompts, and drawing challenges.

The application should be worth opening even when nobody has time to play a game.

The emotional center of Home Base is simple:

> No matter where we are, we meet here.

---

# 2. CORE PRODUCT PRINCIPLES

## 2.1 Family connection comes first

Features should create opportunities for meaningful, funny, affectionate, or memorable interactions.

Do not add features solely to increase engagement metrics.

## 2.2 No global presence tracking

Home Base must NOT contain:

- online indicators
- last-seen timestamps
- active-now indicators
- GPS tracking
- location tracking
- Home/Jonesboro/Work status
- activity monitoring
- background presence monitoring

The only exception is inside an intentionally joined multiplayer game session, where the game may display:

- Mia joined
- Mom joined
- Dad joined
- Ready / Not Ready

That information exists only for the active game session.

## 2.3 Asynchronous interaction is a first-class experience

Home Base must still be useful when family members are not available simultaneously.

Examples:

- Mom leaves Mia a message at night.
- Mia opens it before school.
- Mia answers the Question of the Day after school.
- Dad answers later.
- Mom sees everyone’s answers that evening.

Live interaction enhances Home Base but is never required for the basic experience.

## 2.4 Do not over-gamify family relationships

Do NOT create:

- family streaks
- message points
- leaderboards for communication
- rewards for sending affectionate messages
- engagement badges
- guilt-based reminders

Mystery Club can have playful achievements because it is explicitly a game.

Communication should remain communication.

## 2.5 Mia is nine years old

The interface must be understandable without adult assistance.

Primary interaction targets must be large.

Text should be concise.

Puzzle difficulty should generally follow:

- 70% readily solvable
- 20% requiring collaboration
- 10% challenging

Hints should always be available.

Nothing should punish the player for using a hint.

---

# 3. PRIMARY NAVIGATION

Home Base has four primary destinations:

- Messages
- Mystery Club
- Our Story
- Family Board

A fifth destination exists for parents:

- Parent Settings

There should NOT be a traditional desktop-style sidebar full of navigation options.

The experience should feel like a family clubhouse rather than business software.

---

# 4. ENTRY EXPERIENCE

## 4.1 Home Base Door

The first screen at `/` or `/enter` is the existing fairy-tale cottage artwork,
`public/images/home-base-door.png`, displayed immersively across the viewport.
Do not replace or regenerate the artwork. Overlay only the tagline:

**No matter where we are, we meet here.**

No forms, profile cards, navigation or app menus appear until the actual teal
front door is tapped. A responsive, keyboard-accessible hotspot follows the door
in the image; hover, focus and touch produce a subtle warm glow, never a rectangular
web-button appearance.

The door opens a storybook-style modal asking **What’s the magic word?** over the
cottage. Never display the password on the page. Wrong attempts receive a gentle,
nontechnical response. Successful family-password verification produces a short
warm-light transition, then **Who’s coming home?** with exactly Mom, Dad and Mia.
Selecting a name immediately creates that profile’s session and enters Home Base.
There is no individual password, PIN, passcode or second authentication step.

Keep transitions under 1.5 seconds and respect reduced-motion preferences.
Prioritize iPad while preserving laptop and phone layouts. Remembered sessions can
still open protected destinations directly; visiting the entrance explicitly
always shows the cottage. Remembering a device is optional on profile selection.

---

# 5. HOME SCREEN

The Home screen should answer:

**What is waiting for me at Home Base?**

It should NOT attempt to expose every application feature equally.

Example layout:

HOME BASE  
Sunday, September 13

### Something is waiting for you

💌 2 new messages

### Tonight at Home Base

🔎 The Jonesboro Files  
Continue Case 001: The Midnight Transmission

📖 Our Story  
Mia and the Kingdom Beneath the Stairs  
Mom's turn

### Family Board

💭 Question of the Day  
"If our family owned a theme park, what would its best ride be?"

The home screen should dynamically prioritize:

1. unread personal messages
2. unfinished collaborative activities requiring the current user
3. active mystery
4. Family Board activity
5. starting something new

No presence information appears here.

---

# 6. HOME BASE MESSAGES

Messages are a core feature, not a secondary utility.

## 6.1 Supported message types

A user can send:

- text
- photo
- voice recording
- short video
- doodle/drawing

A single message may contain:

- text only
- media only
- text + media

## 6.2 Recipient selection

Messages can be sent to:

- Mom
- Dad
- Mia
- Mom + Dad
- Mom + Mia
- Dad + Mia
- Everyone

The sender cannot select themselves unless sending to Everyone.

## 6.3 Delivery

The sender chooses:

### Send now

or

### Send later

Scheduled delivery supports:

- date
- time

The recipient must not be able to access scheduled content before the delivery time.

Scheduled messages do not require a background process merely to become visible.

The application may enforce:

`send_at <= current_time`

when loading recipient inboxes.

Push notification delivery can be implemented separately.

## 6.4 Inbox experience

Do not make this look exactly like iMessage.

Messages should feel like items that were intentionally left for someone.

Example:

### Something from Mom

September 8 · 6:42 AM

[voice message]

"Have a great day today. I love you."

❤️ Favorite

## 6.5 Unread state

Unread items should be visually obvious.

Suggested language:

**Something new from Mom**

rather than:

**1 unread message**

when practical.

## 6.6 Message reactions

MVP supports one lightweight reaction:

❤️

Do not build a full emoji reaction system.

The purpose is simply:

"I saw this and loved it."

## 6.7 Favorites

A recipient can favorite any message.

Favorite messages appear in:

**Messages → Favorites**

Favorites are private to the user who favorited the item.

## 6.8 Message archive

Messages remain available unless deliberately deleted by a parent.

Views:

- All
- From Mom
- From Dad
- From Mia
- Favorites

Search is not required for MVP.

## 6.9 Voice messages

Use native browser audio recording where supported.

Required controls:

- record
- stop
- preview
- discard
- send

Maximum MVP length:

**5 minutes**

## 6.10 Video messages

Allow:

- direct recording where browser APIs support it
- upload existing video

Maximum MVP duration:

**2 minutes**

Videos should be compressed or limited appropriately before upload.

## 6.11 Doodles

Provide a simple touch-friendly canvas.

Tools:

- pen
- eraser
- undo
- clear
- adjustable line thickness
- small color palette

Do not attempt to recreate a professional drawing application.

Result is stored as an image asset.

---

# 7. FAMILY BOARD

Family Board provides one small shared interaction at a time.

It should never feel like homework.

MVP includes three activity types.

## 7.1 Question of the Day

Example:

> If our family opened a restaurant, what should it be called?

Each user answers privately.

Before submitting, users cannot see other answers.

Answers reveal when:

- all three have answered

OR

- the configured reveal time occurs

Default reveal time:

**8:00 PM family timezone**

Once revealed, all three responses appear together.

Example:

MIA  
Matt's Meat Mansion

MOM  
Probably Something With Steak

DAD  
Chez Matthew

## 7.2 Question categories

Prompts should include a mixture of:

### Silly

- If Max had a job, what would it be?
- What would Dad name a pirate ship?

### Imaginative

- If we built a theme park, what ride would you design?
- What magical power should our family have?

### Reflective

- What made you laugh today?
- What is something you're looking forward to?

### Family planning

- What should we do together this weekend?
- What dessert should we make next?

Reflective prompts should remain age appropriate and low pressure.

## 7.3 Photo Drop

One prompt appears.

Example:

> Take a picture of something that made you smile today.

Each family member uploads one photo.

Photos remain hidden until reveal.

Reveal behavior follows the same logic as Question of the Day.

## 7.4 Drawing Challenge

Example:

> Draw what you think Max does when everyone leaves the house.

Each user receives:

- simple canvas
- prompt
- optional timer

Default timer:

**60 seconds**

Users may disable the timer.

Drawings reveal simultaneously.

## 7.5 Past Boards

Family Board history is retained.

Calendar or chronological view:

September 8  
📷 Something that made you smile

September 7  
💭 If Max had a job...

September 6  
✏️ Draw Dad as a superhero

This gradually becomes a family memory archive.

---

# 8. MYSTERY CLUB

Mystery Club is Home Base's primary game experience.

It is inspired by cooperative puzzle-box and escape-room experiences but is entirely digital.

## 8.1 Core mechanic

**No player should consistently have enough information to solve the mystery alone.**

Each player receives different information.

Players must communicate.

Typical pattern:

Mia sees a picture.

Mom receives a decoding rule.

Dad receives the sequence.

Together they determine the answer.

## 8.2 Game modes

### MVP: Live Cooperative

All three deliberately join a shared game session.

A session-specific lobby may show:

MIA ✓  
MOM ✓  
DAD ✓

[BEGIN CASE]

This is not global presence.

It applies only to that intentional game session.

### Future: Asynchronous Cooperative

A case can progress over several hours or days.

Example:

Mia completes her task.

Later Mom opens Home Base and receives:

> Mia discovered a locked box. Your clue can open it.

This mode is not required for Home Base 1.0.

Architecture should not prevent it later.

## 8.3 Mystery structure

Each case consists of:

1. introduction
2. scene
3. player-specific clues
4. cooperative puzzle
5. resolution
6. next scene
7. additional puzzles
8. final deduction
9. ending
10. case summary

Typical playtime:

**20 to 30 minutes**

## 8.4 Puzzle component library

MVP Mystery Engine must support at least these eight reusable puzzle types.

### 1. Code Entry

Inputs:

- numeric
- alphanumeric
- phrase

Configurable:

- exact match
- case-insensitive
- whitespace normalization

### 2. Multiple Choice Deduction

One correct answer among configurable choices.

### 3. Sequence / Ordering

Drag items into the correct order.

Examples:

- timeline
- shortest to tallest
- event sequence
- numbered clue ordering

### 4. Matching

Connect related items.

Examples:

- suspect → object
- symbol → meaning
- location → time

### 5. Hidden Object / Hotspot

Image contains clickable regions.

Selecting the correct region advances or reveals a clue.

### 6. Tile / Fragment Assembly

Arrange visual or textual fragments into the correct order.

### 7. Decoder / Cipher

Provide an interactive decoding interface.

Initial supported cipher types:

- Caesar shift
- symbol substitution
- letter-number substitution

### 8. Shared Combination Puzzle

Different players receive different information required to produce one combined answer.

This should be a core reusable component.

## 8.5 Player-specific content

Every scene node may define:

- content shown to everyone
- Mia-only content
- Mom-only content
- Dad-only content

Example data concept:

```json
{
  "shared": "...",
  "mia": "...",
  "mom": "...",
  "dad": "..."
}
```

Players must never be able to trivially inspect another player's clue through the normal UI.

## 8.6 Hint system

Each puzzle may contain:

- Hint 1
- Hint 2
- Give us the answer

Hints should feel thematic.

Example:

Instead of:

> Hint 1

Use:

> Ask Headquarters

Or:

> Max seems interested in the first letter of each line...

There is no score penalty for hints.

Case completion summary may simply state:

**Hints used: 2**

without framing this negatively.

## 8.7 Game state

Game state must be persisted after every meaningful interaction.

If a browser refreshes:

- current scene remains intact
- solved puzzles remain solved
- clues remain available
- game can resume

## 8.8 Case Library

Mystery Club screen:

### Continue Case

The Jonesboro Files  
Case 001: The Midnight Transmission

### Available Cases

Case 002  
Locked

### Solved Cases

Case 000  
Training Mission

## 8.9 Mystery achievements

Light game-specific achievements are allowed.

Examples:

- First Case Solved
- Codebreaker
- No Hint Needed
- Master Detective
- Five Cases Solved

Do not connect Mystery achievements to family communication.

---

# 9. MYSTERY CONTENT FORMAT

Cases should NOT require application code changes.

Adventure content should be represented as structured JSON validated against a defined schema.

The parent/admin interface should allow:

**Import Mystery File**

Process:

1. upload JSON
2. validate schema
3. display errors
4. preview
5. publish

This allows a future mystery to be generated externally and added without redeploying Home Base.

A visual mystery builder can be added later.

---

# 10. OUR STORY

Our Story is a collaborative storytelling experience.

AI continues the narrative based on family choices.

The system is not a chatbot.

It is a structured story game.

## 10.1 Story modes

### Quick Story

Target duration:

**5 to 10 minutes**

Approximately:

3 to 5 decisions

### Bedtime Adventure

Target duration:

**15 to 20 minutes**

Approximately:

6 to 10 decisions

### Epic Adventure

Multi-session story.

May continue across multiple nights.

No fixed decision count.

## 10.2 Story setup

Example creation flow:

### Who is our hero?

- Mia
- Mom
- Dad
- Our whole family
- Create someone

### What kind of story?

- Magical adventure
- Mystery
- Space
- Underwater
- Jungle
- Time travel
- Surprise me

### Tone

- Silly
- Adventurous
- Magical
- Cozy
- Mysterious

Do not offer horror.

## 10.3 Story turn system

Stories rotate among players.

Example:

### MIA'S TURN

> Mia sees three doors.

Choose:

- The tiny blue door
- The enormous golden door
- The door covered in vines
- Something else

After Mia chooses, AI generates the next short segment.

Then:

### MOM'S TURN

## 10.4 Open-ended turns

Some turns should request custom input.

Examples:

> Mom, name the villain.

> Dad, what strange object is sitting on the table?

> Mia, invent a magical animal.

Custom input becomes part of the narrative.

## 10.5 AI generation rules

The AI should:

- maintain continuity
- incorporate prior family decisions
- write at an age-appropriate level
- keep sections concise
- preserve established characters
- avoid graphic violence
- avoid sexual content
- avoid frightening imagery inappropriate for a nine-year-old
- avoid real-world medical advice
- avoid introducing emotionally manipulative family themes
- avoid stories involving abandonment or parental death unless explicitly parent-authored
- end with warmth, humor, adventure, or satisfying resolution

The AI should not generate extremely long passages.

Typical story segment:

**100 to 250 words**

## 10.6 Server-side AI

AI API credentials must never be exposed to the browser.

All generation occurs server-side.

Create an AI provider abstraction so the underlying model can be changed later without rewriting the Story system.

Concept:

```ts
interface StoryProvider {
  continueStory(context): Promise<StoryContinuation>
}
```

## 10.7 Story persistence

Store:

- title
- participants
- story mode
- created date
- current turn
- full narrative
- decisions
- custom responses
- status
- completed date

## 10.8 Storybook

Completed stories go into:

# OUR STORYBOOK

Example:

**Mia and the Kingdom Beneath the Stairs**  
September 18, 2026  
Created by Mia + Mom + Dad

Selecting it displays the complete story in a polished reading view.

Future capability:

**Create printable book**

Not required for MVP.

---

# 11. NOTIFICATIONS

Notifications are secondary to the application itself.

MVP may support browser/PWA push notifications where reliable.

Examples:

> Mom left you something at Home Base.

> It's your turn in Our Story.

> Today's Family Board is ready to reveal.

Do NOT send:

> Mom is online.

> Dad opened Home Base.

> Mia hasn't responded yet.

No guilt-driven notifications.

---

# 12. PROFILES

Exactly three initial profiles:

- Mia
- Mom
- Dad

Each profile has:

- display name
- avatar
- role
- optional profile color
- permissions

Roles:

- child
- parent
- parent/admin

At least one parent is admin.

Both parents may be admins.

---

# 13. AUTHENTICATION

The application is private with no public signup. The shared family password is
the single authentication requirement for normal entry. Its intended value is
supplied privately during setup; never hardcode or display a real credential in
source code, the browser, or documentation. It must be 8–256 characters.

1. Show the cottage.
2. Tap its glowing front door.
3. Enter the family magic word in the modal.
4. Show a brief warm door-opening transition.
5. Choose **Mom**, **Dad**, or **Mia**.
6. Immediately enter Home Base as that profile.

There are NO individual profile passwords or PINs. Profiles retain their distinct
IDs, roles, messages, favorites, Board responses and Mystery clues. A short-lived,
one-use server challenge proves family-password entry before profile selection.
Profile keys are resolved inside that challenge’s family; all subsequent identity
comes from secure session cookies, never client-supplied profile IDs.

## 13.1 Remembered devices and family trust

Keep the existing 12-hour temporary / 30-day remembered sessions and device
revocation. Remembering a device is optional. Normal protected destinations can
resume a valid session; `/` and `/enter` show the cottage for a fresh entry flow.

The family password grants access to choosing any of the three profiles. Profile
selection is attribution, not proof of which person is holding the device.
Private content remains filtered to the selected profile. Family members should
choose their own profile; there is no individual-password identity barrier.

## 13.2 Separate administrative protection

Mom and Dad never need a password to select their profiles or use normal features.
Sensitive changes (device revocation, content publishing, family configuration,
deletions and future provider settings) require a separate **administration key**
inside the relevant parent settings. This key belongs to the family’s administration,
not to Mom, Dad or Mia. It must differ from the family password and be 12–256 characters.
It is provisioned privately, stored only as a salted hash on the family row, and
unlocks existing sensitive permissions for ten minutes on the current parent
session. Child sessions cannot use it. Rate limits and session expiry still apply.

If this optional key is not configured, sensitive actions remain locked; normal
entry and gameplay continue. The fresh D1 schema contains no profile credential hashes. Historical PostgreSQL
installations used a separate removal migration; the first Cloudflare deployment
starts clean. Never reuse an old profile password automatically.

## 13.3 Security requirements

- salted hashes only for the shared phrase and separate administration key
- no plaintext credentials in source, browser bundles or logs
- HttpOnly secure cookies, fixed session expiry and revocation
- same-origin CSRF protection and database-backed rate limits
- one-use, expiring family-entry challenges
- private R2 storage and session-authorized media URLs; every byte request rechecks visibility
- server-side authorization on every data mutation
- no global presence or activity monitoring

---

# 14. MEDIA STORAGE

Media types:

- photo
- audio
- video
- doodle image

Use private object storage.

Suggested path structure:

```text
family/{familyId}/messages/{messageId}/...
family/{familyId}/board/{boardId}/...
family/{familyId}/stories/{storyId}/...
```

Never expose unrestricted public media URLs.

---

# 15. DATA MODEL

Exact implementation may vary, but these entities must exist conceptually.

## families

- id
- name
- timezone
- created_at

## profiles

- id
- family_id
- display_name
- role
- avatar
- profile_color
- created_at

## sessions

- id
- profile_id
- device_identifier_hash
- expires_at
- created_at

## messages

- id
- family_id
- sender_profile_id
- message_type
- text_body
- send_at
- created_at

## message_recipients

- id
- message_id
- recipient_profile_id
- read_at
- favorited_at

## media_assets

- id
- family_id
- owner_profile_id
- related_entity_type
- related_entity_id
- storage_path
- media_type
- metadata
- created_at

## board_prompts

- id
- prompt_type
- prompt_text
- metadata
- active

## board_days

- id
- family_id
- date
- prompt_id
- reveal_at
- revealed_at

## board_responses

- id
- board_day_id
- profile_id
- text_response
- media_asset_id
- submitted_at

## mysteries

- id
- title
- series
- case_number
- description
- content_version
- content_json
- published
- created_at

## mystery_sessions

- id
- mystery_id
- family_id
- status
- current_scene
- state_json
- started_at
- completed_at

## mystery_session_players

- id
- mystery_session_id
- profile_id
- joined_at
- ready

These fields are session-specific and must never be reused as global presence indicators.

## mystery_events

Event log for game recovery/debugging.

- id
- mystery_session_id
- profile_id
- event_type
- event_data
- created_at

## stories

- id
- family_id
- title
- mode
- genre
- tone
- status
- current_profile_id
- story_context_json
- created_at
- completed_at

## story_turns

- id
- story_id
- turn_number
- profile_id
- prompt
- response_type
- player_response
- generated_text
- created_at

---

# 16. TECHNICAL ARCHITECTURE

Recommended stack:

### Frontend

- Next.js
- TypeScript
- React
- responsive PWA

### Styling

- Tailwind CSS
- custom Home Base design system

### Database

- Cloudflare D1 with fresh SQLite-compatible migrations in `db/d1`
- Atomic batches, conditional writes and triggers preserve privacy and concurrency
- Disposable local PostgreSQL contents do not need migration

### Backend

- Next.js server routes/server actions

### Storage

- Private Cloudflare R2 through server-only bindings
- Home Base authorizes every media byte/range request; no public bucket URLs
- Workers-compatible actual-byte media inspection; no external ffprobe process

### Multiplayer synchronization

- D1 persists Mystery Club state, revisions, intentional Ready/Joined choices and history
- Existing two-second read-only polling while game screens are visible
- Durable Objects are optional only when session-scoped push coordination provides a clear benefit; they are not required for the current three-player engine
- Never reuse game membership as global presence

### AI

- server-side provider abstraction

### Deployment

- Cloudflare Workers using the supported OpenNext adapter for the existing Next.js app
- GitHub `main` via Workers Builds after deliberate dashboard connection
- Production origin: `https://mdhomebase.com`
- Local D1/R2 simulation managed by the repository; no cloud account needed for local development
- No production deployment or DNS changes without first informing Matt
- Dashboard-only family instructions: `docs/CLOUDFLARE_SETUP_FOR_MATT.md`

Architecture should prioritize simplicity over microservices.

This is a three-person family application.

Do not engineer it like a Fortune 500 SaaS product.

---

# 17. PWA REQUIREMENTS

Home Base should be installable on:

- Mia's iPad
- Mom's laptop
- Dad's phone/computer

Support:

- app icon
- standalone mode
- splash screen
- responsive layouts
- install metadata
- offline shell where practical

Full offline game play is not required.

---

# 18. RESPONSIVE DESIGN TARGETS

Primary:

### iPad

Touch-first interface.

### Laptop

Comfortable centered layout.

Secondary:

### Phone

All core interactions remain usable.

No desktop-only functionality.

---

# 19. VISUAL DESIGN LANGUAGE

Home Base should feel:

- warm
- cozy
- magical without becoming fantasy-themed everywhere
- modern
- family-specific
- polished
- playful
- not childish
- not corporate

Avoid:

- productivity-dashboard aesthetics
- excessive glassmorphism
- neon gaming UI
- cartoon preschool styling
- generic SaaS cards everywhere

Suggested visual metaphor:

**A modern family clubhouse after dark.**

Suggested palette direction:

- deep navy
- warm cream
- muted gold
- soft coral
- natural green accents

Use generous rounded corners and subtle illustration.

Animations should be short and purposeful.

---

# 20. ACCESSIBILITY

Required:

- large touch targets
- keyboard navigation
- adequate contrast
- descriptive media labels
- reduced motion support
- captions or text alternative capability for important video/audio content
- no information communicated solely by color

---

# 21. PARENT SETTINGS

Parent Settings includes:

### Family

- edit names
- avatars
- timezone

### Security

- change family access phrase
- separate administration-key protection
- revoke remembered device

### Mystery Club

- import mystery
- validate mystery
- preview mystery
- publish/unpublish mystery

### Family Board

- enable/disable prompt categories
- add custom prompts
- set reveal time

### Data

- export family data
- media storage information
- deletion controls

---

# 22. MYSTERY JSON VALIDATION

Create a formal JSON schema.

At minimum validate:

- unique scene IDs
- valid player names
- valid puzzle types
- solution present
- hints present
- next-scene references valid
- no unreachable required scene
- finale exists

Invalid mystery files must never be published.

---

# 23. FIRST MYSTERY

# THE JONESBORO FILES
## Case 001: The Midnight Transmission

Target length:

**20 to 25 minutes**

Difficulty:

**Family / age 9+**

Players:

- Agent Mia
- Agent Mom
- Agent Dad

## 23.1 Premise

Home Base intercepts an unusual transmission.

It was apparently intended for exactly three people.

The message reads:

> THREE AGENTS.
>
> THREE CLUES.
>
> ONE KEY.
>
> FIND IT BEFORE MIDNIGHT.
>
> AND WHATEVER YOU DO...
>
> DO NOT TRUST THE OWL.

The transmission ends.

A case file appears.

## 23.2 Scene One: Three Pieces

Each agent receives a different strip of a damaged transmission.

### Mia

Visual fragment containing:

`TH__D`

and three star symbols.

### Mom

Fragment containing:

`L__K`

and:

`★ = O`

### Dad

Fragment containing:

`_T THE`

and instructions:

> Read the fragments in the order:
>
> MOM → MIA → DAD

Combining information creates:

**LOOK AT THE THIRD STAR**

All players see a star field.

Mia must tap the third highlighted star.

Correct hotspot reveals:

**8**

## 23.3 Scene Two: The Security Log

A digital vault appears.

Three-digit combination required.

Each player receives part of a security timeline.

### Mia

7:42 PM  
A package enters Home Base.

8:14 PM  
The lights flicker.

### Mom

8:03 PM  
An owl symbol appears on camera.

8:27 PM  
The package disappears.

### Dad

Instruction:

> The code is not the times.
>
> Count how many minutes pass between each event after the owl appears.

The family orders events:

7:42  
8:03  
8:14  
8:27

Intervals after owl:

11 minutes  
13 minutes

The earlier star provided:

8

Vault code:

**8-11-13**

Because this interface expects three fields rather than three digits.

Vault opens.

Inside is an image of a brass key engraved with:

`DIXIE`

## 23.4 Scene Three: The Dogs Know Something

A playful intelligence file appears.

### CLASSIFIED PERSONNEL FILE

**MAX**

Position: Senior Intelligence Officer  
Strengths: Hearing  
Weaknesses: Snacks  
Security Clearance: Questionable

**DIXIE**

Position: Field Investigator  
Strengths: Persistence  
Weaknesses: Also Snacks  
Security Clearance: Slightly Less Questionable

The key says DIXIE.

Mia receives an illustrated room image containing several dog-related objects.

Mom receives:

> The investigator always looks LEFT first.

Dad receives:

> Ignore anything touching the floor.

Mia must identify a dog portrait located on the left side of the room and not touching the floor.

Selecting it reveals four symbols:

🌙 ⭐ 🔑 🦉

## 23.5 Scene Four: The Owl Cipher

Mom receives symbol decoding information:

🌙 = M  
⭐ = A

Mia receives:

🔑 = P

Dad receives:

🦉 = ?

Dad also receives:

> The owl is not a letter.
>
> It tells you where to look.

The four-symbol sequence therefore starts:

M A P

The owl indicates:

**LOOK AT THE MAP**

A map appears.

## 23.6 Scene Five: The Map

The map contains five marked locations.

Each agent receives one elimination clue.

### Mia

> The key isn't near water.

### Mom

> The key is west of the tower.

### Dad

> The key is not inside the forest.

Only one location satisfies all three clues:

**The Old Observatory**

Players select it.

## 23.7 Scene Six: The Observatory

At the Observatory is a locked cabinet with four rotating tiles.

Each tile contains part of an image.

Players must arrange the pieces into a complete owl crest.

When assembled, the crest opens.

Inside is no stolen treasure.

Instead:

> AGENTS MIA, MOM, AND DAD:
>
> Congratulations.
>
> If you are reading this, Home Base is operational.
>
> The owl was never your enemy.
>
> The owl delivers the cases.
>
> Your first test is complete.
>
> More transmissions will follow.

A small owl stamps the file:

**CASE SOLVED**

## 23.8 Ending

Display:

# CASE SOLVED

The Midnight Transmission

Completed by:

Mia  
Mom  
Dad

Optional summary:

- puzzles solved
- hints used
- completion time

Unlock:

**Home Base Agent Badge**

Tease:

> THE JONESBORO FILES WILL CONTINUE.

---

# 24. STORY ENGINE SYSTEM PROMPT

Implement approximately this behavior, adapting to provider format:

```text
You are the storytelling engine for Home Base, a private collaborative
family storytelling application.

The primary child participant is nine years old.

Continue the existing story based strictly on the established narrative,
characters, world, and latest player decision.

Write 100-250 words unless the application specifies otherwise.

The story should be imaginative, warm, funny, adventurous, magical,
mysterious, or cozy depending on the selected tone.

Maintain continuity.

Do not overwrite prior player choices.

Do not introduce graphic violence, sexual content, frightening horror,
parental abandonment, parental death, or age-inappropriate themes.

Do not provide real-world medical, legal, or dangerous instructions.

End each segment at a natural decision point.

Return structured output containing:

narrative
next_turn_prompt
choice_options
allow_custom_response
```

---

# 25. HOME BASE 1.0 MVP

Home Base 1.0 is complete when all of the following work reliably.

## Core

- three profiles
- secure device sessions
- iPad-friendly PWA
- responsive laptop experience
- Home Base home screen
- no global presence system

## Messages

- text
- photo
- voice
- video
- doodle
- recipients
- unread state
- scheduled delivery
- favorites
- ❤️ acknowledgment

## Family Board

- question
- photo prompt
- drawing prompt
- private submission
- synchronized reveal
- history

## Mystery Club

- case library
- live lobby
- player-specific clues
- eight reusable puzzle components
- saved game state
- hints
- case completion
- JSON mystery import
- The Midnight Transmission playable from beginning to end

## Our Story

- Quick
- Bedtime
- Epic
- turn rotation
- multiple-choice decisions
- custom decisions
- AI continuation
- persistence
- completed Storybook

---

# 26. NON-GOALS FOR 1.0

Do not build yet:

- GPS
- global presence
- family calendar
- chore tracking
- family task management
- full chat
- video calling
- multiplayer arcade games
- printable storybook generation
- visual mystery editor
- public accounts
- friend accounts
- social sharing
- native iOS application
- Android application
- AI-generated mystery creation inside the app
- elaborate achievement systems

---

# 27. FUTURE HOME BASE 1.1

Potential additions:

## Drops

Create a surprise package for another family member.

Supports:

- text
- photo
- audio
- video
- drawing
- optional mini puzzle
- scheduled unlock

Example:

> A Drop from Mom unlocks tomorrow morning.

## Asynchronous Mystery Club

Different family members complete pieces at different times.

## Visual Mystery Builder

Parent creates cases from the browser without JSON.

## Story Illustrations

Generate occasional illustrations from completed story scenes.

## Printable Storybooks

Export favorite stories into polished PDF books.

## Special Events

- birthdays
- holidays
- vacations
- first day of school
- family milestones

---

# 28. DEVELOPMENT STRATEGY FOR ASTRA / CODEX

Do not have multiple agents invent architecture independently.

One foundation workstream must establish shared contracts first.

# PHASE 0: FOUNDATION

## Workstream A: Architecture

Branch:

`feature/foundation`

Responsibilities:

- initialize application
- TypeScript configuration
- database
- authentication
- session handling
- schema
- media abstraction
- design tokens
- navigation shell
- shared components
- PWA manifest
- test framework

Deliverables:

- database migrations
- type definitions
- repository structure
- shared API contracts
- seeded family profiles
- README development instructions

Nothing else should merge before Foundation contracts are stable.

# PHASE 1: PARALLEL FEATURE DEVELOPMENT

After Foundation merges, create parallel worktrees.

## Workstream B: Messages

Branch:

`feature/messages`

Build:

- inbox
- composer
- recipients
- text
- photos
- audio
- video
- doodles
- scheduling
- favorites
- ❤️
- unread state
- message archive

Must use Foundation authentication and media APIs.

## Workstream C: Family Board

Branch:

`feature/family-board`

Build:

- daily prompt engine
- question responses
- photo drop
- drawing challenge
- reveal logic
- history
- custom parent prompts

## Workstream D: Mystery Engine

Branch:

`feature/mystery-engine`

Build:

- mystery schema
- JSON validator
- session system
- explicit game lobby
- player-specific clue delivery
- game state
- puzzle components
- hints
- resume
- completion
- case library

Do not hardcode The Midnight Transmission into React components.

It must run through the generic engine.

## Workstream E: First Mystery

Branch:

`content/midnight-transmission`

Build:

- JSON content package
- required illustrations/assets
- puzzle configuration
- hints
- narrative
- ending
- validation tests

No application architecture changes.

This workstream proves that Mystery Engine content can truly remain independent from code.

## Workstream F: Our Story

Branch:

`feature/our-story`

Build:

- story creation
- mode selection
- turn rotation
- server-side AI provider
- story context management
- structured generation
- persistence
- Storybook
- safe retry behavior

# PHASE 2: INTEGRATION

## Workstream G: Home Experience

Branch:

`feature/home-integration`

Build:

- Home screen prioritization
- Home Base Door
- cross-feature cards
- unread message surfacing
- active story surfacing
- active case surfacing
- Family Board surfacing

No global presence implementation.

# PHASE 3: QA

## Workstream H: Family QA

Branch:

`qa/homebase-1.0`

Test the application specifically as:

### Mia

iPad Safari/PWA

### Mom

Laptop browser

### Dad

Phone + desktop

Test:

- three simultaneous Mystery clients
- browser refresh during puzzle
- network interruption
- scheduled message visibility
- media playback
- voice recording
- touch drawing
- story generation failure
- repeated puzzle submissions
- accidental double taps
- game resume
- authentication expiration

---

# 29. TESTING REQUIREMENTS

Unit tests:

- mystery JSON validation
- puzzle answer validation
- Family Board reveal logic
- scheduled message visibility
- story turn rotation
- authentication authorization

Integration tests:

- send message → recipient inbox
- submit all Board responses → reveal
- start mystery → join three profiles → advance
- refresh mystery → resume correct state
- complete story → Storybook

End-to-end test:

**The Midnight Transmission**

Must be playable from beginning to end with three simulated users.

---

# 30. PRODUCT ACCEPTANCE TEST

Home Base succeeds if this interaction works:

At night, Mom opens her laptop.

She records:

> Good morning Mia. I hope you have an amazing day. I love you.

She schedules it for 6:45 AM.

The next morning, Mia opens Home Base on her iPad.

She sees:

> Something from Mom is waiting for you.

She listens to the message.

She taps ❤️.

Then she sees:

> QUESTION OF THE DAY
>
> If you could surprise Mom with anything when she gets home, what would it be?

She answers.

Later that evening, the three family members intentionally enter Mystery Club and continue:

**The Jonesboro Files**

Nobody has been tracked.

Nobody has been pressured to maintain a streak.

Nobody needed to be online at the same time until they deliberately chose to play together.

Home Base has done its job.
