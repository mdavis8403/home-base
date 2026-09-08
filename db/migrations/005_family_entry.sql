-- Profile choices identify family members; only the shared phrase authenticates entry.
ALTER TABLE profiles DROP COLUMN passcode_hash;
ALTER TABLE families ADD COLUMN admin_key_hash text;
-- Old profile-password verification must not authorize administrative changes.
UPDATE sessions SET parent_verified_until = NULL;
DELETE FROM auth_challenges;
DELETE FROM auth_rate_limits WHERE bucket LIKE 'profile:%' OR bucket LIKE 'reauth:%';
