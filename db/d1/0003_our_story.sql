-- Our Story (Phase 1): a shared family storybook driven by deterministic mock
-- content. Purpose-built tables; the dormant Phase-0 stories/story_turns/
-- story_participants scaffold (Pass-the-Story shaped) is left untouched and unused.
--
-- A story_book is one adventure. Its pages are the accepted spreads, in order:
-- sequence 0 is the opening; the newest page is where the family is reading now.
-- continuity_json carries the three conceptual memory layers for later AI use
-- (familyProfile / universe / story) plus unresolved threads. cover_ref and
-- opening_ref are nullable image references reserved for a future image phase.
CREATE TABLE story_books (
  id text PRIMARY KEY,
  family_id text NOT NULL REFERENCES families(id),
  status text NOT NULL CHECK (status IN ('active','completed')),
  title text NOT NULL,
  subtitle text,
  adventure_type text NOT NULL,
  mood text NOT NULL,
  length_mode text NOT NULL CHECK (length_mode IN ('quick','night','ongoing')),
  cast_json text NOT NULL DEFAULT '[]' CHECK (json_valid(cast_json)),
  engine_key text NOT NULL,
  current_sequence integer NOT NULL DEFAULT 0,
  current_chapter integer NOT NULL DEFAULT 1,
  chapter_count integer NOT NULL DEFAULT 1,
  summary text NOT NULL DEFAULT '',
  continuity_json text NOT NULL DEFAULT '{}' CHECK (json_valid(continuity_json)),
  cover_ref text,
  opening_ref text,
  created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at text,
  UNIQUE (id, family_id)
);
CREATE TABLE story_pages (
  id text PRIMARY KEY,
  family_id text NOT NULL,
  story_id text NOT NULL,
  sequence integer NOT NULL CHECK (sequence >= 0),
  chapter integer NOT NULL DEFAULT 1,
  chapter_title text,
  kind text NOT NULL CHECK (kind IN ('opening','choice','input','chapter','ending')),
  node text NOT NULL,
  narration text NOT NULL DEFAULT '',
  choices_json text NOT NULL DEFAULT '[]' CHECK (json_valid(choices_json)),
  selected_choice text,
  input_prompt text,
  input_response text,
  state_json text NOT NULL DEFAULT '{}' CHECK (json_valid(state_json)),
  accepted_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (story_id, sequence),
  FOREIGN KEY (story_id, family_id) REFERENCES story_books(id, family_id)
);
CREATE INDEX story_books_family_idx ON story_books(family_id, updated_at DESC);
CREATE INDEX story_pages_book_idx ON story_pages(story_id, sequence);
