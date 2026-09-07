-- Private recipient state and acknowledgments; original Foundation tables stay intact.
ALTER TABLE message_recipients ADD COLUMN loved_at timestamptz;
CREATE INDEX media_message_idx ON media_assets(family_id, related_entity_type, related_entity_id);
CREATE INDEX messages_sender_idx ON messages(family_id, sender_profile_id, send_at DESC);
