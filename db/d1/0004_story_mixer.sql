-- The Story Mixer: family Mad-Libs that precedes a story. Each of Mom, Dad, and
-- Mia privately answers ten assigned "ingredient" cards; the 30 answers are then
-- combined into a title, a reveal, and the generated storybook. Answers are
-- private per profile until the reveal — enforced in the service, keyed here by
-- profile_key. This extends Our Story (migration 0003) and leaves story_books /
-- story_pages untouched so old stories still open and reread.

-- One mixer session per new story. status: collecting → complete (all 30 in) →
-- revealed (title minted + book created). story_id links to the created book;
-- reveal_json caches the highlight reel + title/premise chosen at reveal time.
CREATE TABLE story_mixer_sessions (
  id text PRIMARY KEY,
  family_id text NOT NULL REFERENCES families(id),
  status text NOT NULL DEFAULT 'collecting'
    CHECK (status IN ('collecting','complete','revealed')),
  story_id text,
  reveal_json text,
  created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (id, family_id)
);

-- The ten cards assigned to each profile, dealt deterministically from the
-- session id. Persisted so a reload always returns the same questions.
CREATE TABLE story_mixer_assignments (
  id text PRIMARY KEY,
  session_id text NOT NULL,
  family_id text NOT NULL,
  profile_key text NOT NULL CHECK (profile_key IN ('mom','dad','mia')),
  seq integer NOT NULL CHECK (seq >= 1 AND seq <= 10),
  question_id text NOT NULL,
  ingredient_type text NOT NULL,
  UNIQUE (session_id, profile_key, seq),
  FOREIGN KEY (session_id, family_id) REFERENCES story_mixer_sessions(id, family_id)
);

-- One saved answer per assigned card. value is the normalized ingredient text
-- (curated label, exact custom text, or a resolved Surprise Me pick).
CREATE TABLE story_mixer_answers (
  id text PRIMARY KEY,
  session_id text NOT NULL,
  family_id text NOT NULL,
  profile_key text NOT NULL CHECK (profile_key IN ('mom','dad','mia')),
  seq integer NOT NULL CHECK (seq >= 1 AND seq <= 10),
  question_id text NOT NULL,
  ingredient_type text NOT NULL,
  option_id text NOT NULL,
  value text NOT NULL,
  is_custom integer NOT NULL DEFAULT 0,
  created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (session_id, profile_key, seq),
  FOREIGN KEY (session_id, family_id) REFERENCES story_mixer_sessions(id, family_id)
);

CREATE INDEX story_mixer_sessions_family_idx
  ON story_mixer_sessions(family_id, updated_at DESC);
CREATE INDEX story_mixer_assignments_idx
  ON story_mixer_assignments(session_id, profile_key, seq);
CREATE INDEX story_mixer_answers_idx
  ON story_mixer_answers(session_id, profile_key, seq);
