-- The account that set the site up. Other admins do not see or manage it.
ALTER TABLE users ADD COLUMN is_owner boolean NOT NULL DEFAULT false;
UPDATE users SET is_owner = true
 WHERE id = (SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1);
