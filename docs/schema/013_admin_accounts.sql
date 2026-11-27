-- Admin accounts: creating admins, deleting accounts, and a first-login password change.
-- Safe to run more than once.

-- A new admin gets a temporary password and must choose their own at first login.
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Deleting a doctor erases their login but keeps what they entered in patients' records, labelled as a removed
-- doctor. So the doctor's profile stays (anonymised) and simply loses its link to a login.
ALTER TABLE provider_profile ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE provider_profile DROP CONSTRAINT IF EXISTS provider_profile_user_id_fkey;
ALTER TABLE provider_profile ADD CONSTRAINT provider_profile_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL;

ALTER TABLE admin_user_actions DROP CONSTRAINT IF EXISTS admin_user_actions_action_check;
ALTER TABLE admin_user_actions ADD CONSTRAINT admin_user_actions_action_check
    CHECK (action IN ('suspend', 'reactivate', 'revoke_devices', 'delete', 'create_admin'));
ALTER TABLE admin_user_actions ALTER COLUMN action TYPE VARCHAR(20);
ALTER TABLE admin_user_actions ALTER COLUMN target_email TYPE VARCHAR(300);
