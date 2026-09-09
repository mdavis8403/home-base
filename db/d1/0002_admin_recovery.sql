-- Key rotation and invalidation of old grants must be one atomic database write.
CREATE TRIGGER admin_key_rotated AFTER UPDATE OF admin_key_hash ON families
WHEN OLD.admin_key_hash IS NOT NEW.admin_key_hash
BEGIN
 UPDATE sessions SET parent_verified_until=NULL
 WHERE profile_id IN (SELECT id FROM profiles WHERE family_id=NEW.id);
END;
