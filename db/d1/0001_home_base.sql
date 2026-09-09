-- Fresh Cloudflare D1 schema. Historical PostgreSQL migrations are not applied to D1.
CREATE TABLE families (
  id text PRIMARY KEY, name text NOT NULL, timezone text NOT NULL,
  access_phrase_hash text NOT NULL, admin_key_hash text,
  board_reveal_time text NOT NULL DEFAULT '20:00',
  board_categories text NOT NULL DEFAULT '["silly","imaginative","reflective","family planning"]' CHECK(json_valid(board_categories) AND json_array_length(board_categories)>0), created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE profiles (
  id text PRIMARY KEY, family_id text NOT NULL REFERENCES families(id),
  profile_key text NOT NULL CHECK (profile_key IN ('mia','mom','dad')),
  display_name text NOT NULL, role text NOT NULL CHECK (role IN ('child','parent','admin')),
  avatar text NOT NULL, profile_color text NOT NULL,
  created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (family_id, profile_key), UNIQUE (id, family_id),
  CHECK ((profile_key = 'mia' AND role = 'child') OR (profile_key IN ('mom','dad') AND role IN ('parent','admin')))
);
CREATE TABLE sessions (
  id text PRIMARY KEY, profile_id text NOT NULL REFERENCES profiles(id),
  token_hash text NOT NULL UNIQUE, device_identifier_hash text NOT NULL,
  remembered integer NOT NULL, expires_at text NOT NULL,
  parent_verified_until text, created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX sessions_profile_idx ON sessions(profile_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);
CREATE TABLE auth_challenges (
  token_hash text PRIMARY KEY, family_id text NOT NULL REFERENCES families(id), expires_at text NOT NULL
);
-- Fixed-window counters contain no IP, device behavior, or activity history.
CREATE TABLE auth_rate_limits (
  bucket text PRIMARY KEY, attempts integer NOT NULL, reset_at text NOT NULL
);
CREATE TABLE messages (
  id text PRIMARY KEY, family_id text NOT NULL REFERENCES families(id), sender_profile_id text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('text','photo','audio','video','doodle','mixed')),
  write_token text, text_body text, send_at text NOT NULL, created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (id, family_id), FOREIGN KEY (sender_profile_id, family_id) REFERENCES profiles(id, family_id)
);
CREATE TABLE message_recipients (
  id text PRIMARY KEY, family_id text NOT NULL, message_id text NOT NULL, recipient_profile_id text NOT NULL,
  read_at text, favorited_at text, loved_at text,
  UNIQUE (message_id, recipient_profile_id),
  FOREIGN KEY (message_id, family_id) REFERENCES messages(id, family_id),
  FOREIGN KEY (recipient_profile_id, family_id) REFERENCES profiles(id, family_id)
);
CREATE INDEX messages_delivery_idx ON messages(family_id, send_at);
CREATE INDEX recipients_profile_idx ON message_recipients(recipient_profile_id);
CREATE TABLE media_assets (
  id text PRIMARY KEY, family_id text NOT NULL REFERENCES families(id), owner_profile_id text NOT NULL,
  related_entity_type text NOT NULL CHECK (related_entity_type IN ('messages','board','stories')),
  related_entity_id text NOT NULL, storage_path text NOT NULL UNIQUE,
  media_type text NOT NULL CHECK (media_type IN ('photo','audio','video','doodle')),
  metadata text NOT NULL DEFAULT '{}', created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (id, family_id), FOREIGN KEY (owner_profile_id, family_id) REFERENCES profiles(id, family_id)
);
CREATE TABLE board_prompts (
  id text PRIMARY KEY, family_id text NOT NULL REFERENCES families(id),
  prompt_type text NOT NULL CHECK (prompt_type IN ('question','photo','drawing')),
  prompt_text text NOT NULL, category text NOT NULL DEFAULT 'silly' CHECK(category IN ('silly','imaginative','reflective','family planning')), builtin_key text, created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), metadata text NOT NULL DEFAULT '{}', active integer NOT NULL DEFAULT true,
  UNIQUE (id, family_id)
);
CREATE TABLE board_days (
  id text PRIMARY KEY, family_id text NOT NULL REFERENCES families(id), date text NOT NULL,
  prompt_id text NOT NULL, reveal_at text NOT NULL, revealed_at text,
  UNIQUE (family_id, date), UNIQUE (id, family_id),
  FOREIGN KEY (prompt_id, family_id) REFERENCES board_prompts(id, family_id)
);
CREATE TABLE board_responses (
  id text PRIMARY KEY, family_id text NOT NULL, board_day_id text NOT NULL, profile_id text NOT NULL,
  text_response text, media_asset_id text, submitted_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (board_day_id, profile_id), FOREIGN KEY (board_day_id, family_id) REFERENCES board_days(id, family_id),
  FOREIGN KEY (profile_id, family_id) REFERENCES profiles(id, family_id),
  FOREIGN KEY (media_asset_id, family_id) REFERENCES media_assets(id, family_id)
);
CREATE TABLE mysteries (
  id text PRIMARY KEY, family_id text NOT NULL REFERENCES families(id), title text NOT NULL, series text, case_number integer,
  package_slug text, description text NOT NULL, content_version integer NOT NULL, content_json text NOT NULL,
  published integer NOT NULL DEFAULT false, created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), UNIQUE (id, family_id)
);
CREATE TABLE mystery_sessions (
  id text PRIMARY KEY, mystery_id text NOT NULL, family_id text NOT NULL REFERENCES families(id),
  status text NOT NULL CHECK (status IN ('lobby','playing','completed')),
  revision integer NOT NULL DEFAULT 0, content_snapshot text, current_scene text, state_json text NOT NULL DEFAULT '{}', started_at text, completed_at text,
  UNIQUE (id, family_id), FOREIGN KEY (mystery_id, family_id) REFERENCES mysteries(id, family_id)
);
-- Intentional game membership ONLY. No global presence fields or services.
CREATE TABLE mystery_session_players (
  id text PRIMARY KEY, family_id text NOT NULL, mystery_session_id text NOT NULL, profile_id text NOT NULL,
  joined_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), ready integer NOT NULL DEFAULT false,
  UNIQUE (mystery_session_id, profile_id),
  FOREIGN KEY (mystery_session_id, family_id) REFERENCES mystery_sessions(id, family_id),
  FOREIGN KEY (profile_id, family_id) REFERENCES profiles(id, family_id)
);
CREATE TABLE mystery_events (
  id text PRIMARY KEY, family_id text NOT NULL, mystery_session_id text NOT NULL, profile_id text NOT NULL,
  event_type text NOT NULL, event_data text NOT NULL, created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (mystery_session_id, family_id) REFERENCES mystery_sessions(id, family_id),
  FOREIGN KEY (profile_id, family_id) REFERENCES profiles(id, family_id)
);
CREATE TABLE stories (
  id text PRIMARY KEY, family_id text NOT NULL REFERENCES families(id), title text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('quick','bedtime','epic')), genre text NOT NULL, tone text NOT NULL,
  status text NOT NULL CHECK (status IN ('active','completed')), current_profile_id text NOT NULL,
  story_context_json text NOT NULL DEFAULT '{}', created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), completed_at text,
  UNIQUE (id, family_id), FOREIGN KEY (current_profile_id, family_id) REFERENCES profiles(id, family_id)
);
CREATE TABLE story_participants (
  story_id text NOT NULL, family_id text NOT NULL, profile_id text NOT NULL, turn_order integer NOT NULL CHECK (turn_order >= 0),
  PRIMARY KEY (story_id, profile_id), UNIQUE (story_id, turn_order),
  FOREIGN KEY (story_id, family_id) REFERENCES stories(id, family_id),
  FOREIGN KEY (profile_id, family_id) REFERENCES profiles(id, family_id)
);
CREATE TABLE story_turns (
  id text PRIMARY KEY, family_id text NOT NULL, story_id text NOT NULL, turn_number integer NOT NULL CHECK (turn_number > 0),
  profile_id text NOT NULL, prompt text NOT NULL, response_type text NOT NULL,
  player_response text, generated_text text, created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), UNIQUE (story_id, turn_number),
  FOREIGN KEY (story_id, family_id) REFERENCES stories(id, family_id),
  FOREIGN KEY (profile_id, family_id) REFERENCES profiles(id, family_id)
);
-- No database HTTP API or browser credentials. Access is through authorized server services.

CREATE UNIQUE INDEX board_builtin_idx ON board_prompts(family_id,builtin_key);
CREATE INDEX board_history_idx ON board_days(family_id,date DESC);
CREATE INDEX board_media_idx ON board_responses(media_asset_id);
CREATE UNIQUE INDEX mystery_package_idx ON mysteries(family_id,package_slug);
CREATE UNIQUE INDEX mystery_active_idx ON mystery_sessions(family_id,mystery_id) WHERE status<>'completed';
CREATE INDEX mystery_family_idx ON mystery_sessions(family_id,completed_at DESC);
CREATE INDEX media_entity_idx ON media_assets(family_id,related_entity_type,related_entity_id);
CREATE INDEX messages_sender_idx ON messages(family_id,sender_profile_id,send_at DESC);
CREATE TRIGGER board_reveal AFTER INSERT ON board_responses
WHEN (SELECT count(*) FROM board_responses WHERE board_day_id=NEW.board_day_id)=3
BEGIN
 UPDATE board_days SET revealed_at=coalesce(revealed_at,min(strftime('%Y-%m-%dT%H:%M:%fZ','now'),reveal_at)) WHERE id=NEW.board_day_id;
END;
-- A conditional event insert checks revision. The trigger commits membership,
-- state and event together in one D1 statement; no process-local lock is used.
CREATE TRIGGER mystery_apply AFTER INSERT ON mystery_events
BEGIN
 INSERT INTO mystery_session_players(id,family_id,mystery_session_id,profile_id)
 SELECT NEW.id,NEW.family_id,NEW.mystery_session_id,NEW.profile_id WHERE NEW.event_type='join'
 ON CONFLICT(mystery_session_id,profile_id) DO NOTHING;
 UPDATE mystery_session_players SET ready=json_extract(NEW.event_data,'$.ready')
 WHERE mystery_session_id=NEW.mystery_session_id AND profile_id=NEW.profile_id AND NEW.event_type='ready';
 UPDATE mystery_sessions SET revision=revision+1,
 state_json=json_extract(NEW.event_data,'$.state'),
 current_scene=json_extract(NEW.event_data,'$.next'),status=json_extract(NEW.event_data,'$.status'),
 started_at= CASE WHEN NEW.event_type='start' THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE started_at END ,
 completed_at= CASE WHEN json_extract(NEW.event_data,'$.status')='completed' THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE completed_at END
 WHERE id=NEW.mystery_session_id AND family_id=NEW.family_id;
END;
