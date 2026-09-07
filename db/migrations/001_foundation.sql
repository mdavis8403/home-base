-- Foundation only: future-feature tables reserve shared contracts, not behavior.
CREATE TABLE families (
  id uuid PRIMARY KEY, name text NOT NULL, timezone text NOT NULL,
  access_phrase_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE profiles (
  id uuid PRIMARY KEY, family_id uuid NOT NULL REFERENCES families(id),
  profile_key text NOT NULL CHECK (profile_key IN ('mia','mom','dad')),
  display_name text NOT NULL, role text NOT NULL CHECK (role IN ('child','parent','admin')),
  avatar text NOT NULL, profile_color text NOT NULL, passcode_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, profile_key), UNIQUE (id, family_id),
  CHECK ((profile_key = 'mia' AND role = 'child') OR (profile_key IN ('mom','dad') AND role IN ('parent','admin')))
);
CREATE TABLE sessions (
  id uuid PRIMARY KEY, profile_id uuid NOT NULL REFERENCES profiles(id),
  token_hash text NOT NULL UNIQUE, device_identifier_hash text NOT NULL,
  remembered boolean NOT NULL, expires_at timestamptz NOT NULL,
  parent_verified_until timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_profile_idx ON sessions(profile_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);
CREATE TABLE auth_challenges (
  token_hash text PRIMARY KEY, family_id uuid NOT NULL REFERENCES families(id), expires_at timestamptz NOT NULL
);
-- Fixed-window counters contain no IP, device behavior, or activity history.
CREATE TABLE auth_rate_limits (
  bucket text PRIMARY KEY, attempts integer NOT NULL, reset_at timestamptz NOT NULL
);
CREATE TABLE messages (
  id uuid PRIMARY KEY, family_id uuid NOT NULL REFERENCES families(id), sender_profile_id uuid NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('text','photo','audio','video','doodle','mixed')),
  text_body text, send_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, family_id), FOREIGN KEY (sender_profile_id, family_id) REFERENCES profiles(id, family_id)
);
CREATE TABLE message_recipients (
  id uuid PRIMARY KEY, family_id uuid NOT NULL, message_id uuid NOT NULL, recipient_profile_id uuid NOT NULL,
  read_at timestamptz, favorited_at timestamptz,
  UNIQUE (message_id, recipient_profile_id),
  FOREIGN KEY (message_id, family_id) REFERENCES messages(id, family_id),
  FOREIGN KEY (recipient_profile_id, family_id) REFERENCES profiles(id, family_id)
);
CREATE INDEX messages_delivery_idx ON messages(family_id, send_at);
CREATE INDEX recipients_profile_idx ON message_recipients(recipient_profile_id);
CREATE TABLE media_assets (
  id uuid PRIMARY KEY, family_id uuid NOT NULL REFERENCES families(id), owner_profile_id uuid NOT NULL,
  related_entity_type text NOT NULL CHECK (related_entity_type IN ('messages','board','stories')),
  related_entity_id uuid NOT NULL, storage_path text NOT NULL UNIQUE,
  media_type text NOT NULL CHECK (media_type IN ('photo','audio','video','doodle')),
  metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, family_id), FOREIGN KEY (owner_profile_id, family_id) REFERENCES profiles(id, family_id)
);
CREATE TABLE board_prompts (
  id uuid PRIMARY KEY, family_id uuid NOT NULL REFERENCES families(id),
  prompt_type text NOT NULL CHECK (prompt_type IN ('question','photo','drawing')),
  prompt_text text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}', active boolean NOT NULL DEFAULT true,
  UNIQUE (id, family_id)
);
CREATE TABLE board_days (
  id uuid PRIMARY KEY, family_id uuid NOT NULL REFERENCES families(id), date date NOT NULL,
  prompt_id uuid NOT NULL, reveal_at timestamptz NOT NULL, revealed_at timestamptz,
  UNIQUE (family_id, date), UNIQUE (id, family_id),
  FOREIGN KEY (prompt_id, family_id) REFERENCES board_prompts(id, family_id)
);
CREATE TABLE board_responses (
  id uuid PRIMARY KEY, family_id uuid NOT NULL, board_day_id uuid NOT NULL, profile_id uuid NOT NULL,
  text_response text, media_asset_id uuid, submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (board_day_id, profile_id), FOREIGN KEY (board_day_id, family_id) REFERENCES board_days(id, family_id),
  FOREIGN KEY (profile_id, family_id) REFERENCES profiles(id, family_id),
  FOREIGN KEY (media_asset_id, family_id) REFERENCES media_assets(id, family_id)
);
CREATE TABLE mysteries (
  id uuid PRIMARY KEY, family_id uuid NOT NULL REFERENCES families(id), title text NOT NULL, series text, case_number integer,
  description text NOT NULL, content_version integer NOT NULL, content_json jsonb NOT NULL,
  published boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (id, family_id)
);
CREATE TABLE mystery_sessions (
  id uuid PRIMARY KEY, mystery_id uuid NOT NULL, family_id uuid NOT NULL REFERENCES families(id),
  status text NOT NULL CHECK (status IN ('lobby','playing','completed')),
  current_scene text, state_json jsonb NOT NULL DEFAULT '{}', started_at timestamptz, completed_at timestamptz,
  UNIQUE (id, family_id), FOREIGN KEY (mystery_id, family_id) REFERENCES mysteries(id, family_id)
);
-- Intentional game membership ONLY. No global presence fields or services.
CREATE TABLE mystery_session_players (
  id uuid PRIMARY KEY, family_id uuid NOT NULL, mystery_session_id uuid NOT NULL, profile_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(), ready boolean NOT NULL DEFAULT false,
  UNIQUE (mystery_session_id, profile_id),
  FOREIGN KEY (mystery_session_id, family_id) REFERENCES mystery_sessions(id, family_id),
  FOREIGN KEY (profile_id, family_id) REFERENCES profiles(id, family_id)
);
CREATE TABLE mystery_events (
  id uuid PRIMARY KEY, family_id uuid NOT NULL, mystery_session_id uuid NOT NULL, profile_id uuid NOT NULL,
  event_type text NOT NULL, event_data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (mystery_session_id, family_id) REFERENCES mystery_sessions(id, family_id),
  FOREIGN KEY (profile_id, family_id) REFERENCES profiles(id, family_id)
);
CREATE TABLE stories (
  id uuid PRIMARY KEY, family_id uuid NOT NULL REFERENCES families(id), title text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('quick','bedtime','epic')), genre text NOT NULL, tone text NOT NULL,
  status text NOT NULL CHECK (status IN ('active','completed')), current_profile_id uuid NOT NULL,
  story_context_json jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  UNIQUE (id, family_id), FOREIGN KEY (current_profile_id, family_id) REFERENCES profiles(id, family_id)
);
CREATE TABLE story_participants (
  story_id uuid NOT NULL, family_id uuid NOT NULL, profile_id uuid NOT NULL, turn_order integer NOT NULL CHECK (turn_order >= 0),
  PRIMARY KEY (story_id, profile_id), UNIQUE (story_id, turn_order),
  FOREIGN KEY (story_id, family_id) REFERENCES stories(id, family_id),
  FOREIGN KEY (profile_id, family_id) REFERENCES profiles(id, family_id)
);
CREATE TABLE story_turns (
  id uuid PRIMARY KEY, family_id uuid NOT NULL, story_id uuid NOT NULL, turn_number integer NOT NULL CHECK (turn_number > 0),
  profile_id uuid NOT NULL, prompt text NOT NULL, response_type text NOT NULL,
  player_response text, generated_text text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (story_id, turn_number),
  FOREIGN KEY (story_id, family_id) REFERENCES stories(id, family_id),
  FOREIGN KEY (profile_id, family_id) REFERENCES profiles(id, family_id)
);
-- No database HTTP API or browser credentials. Access is through authorized server services.
