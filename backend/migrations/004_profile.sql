ALTER TABLE users ADD COLUMN bio text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN avatar_url text;
ALTER TABLE users ADD COLUMN avatar_public_id text;
