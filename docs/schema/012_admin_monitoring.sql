-- Admin stage: a record of every login attempt, a record of what admins do to user accounts, and a way to
-- say that an administrator ended a doctor's access. Safe to run more than once.

CREATE TABLE IF NOT EXISTS login_events (
    event_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES users(user_id) ON DELETE SET NULL,
    email        VARCHAR(255) NOT NULL,                       -- as typed, lower case
    success      BOOLEAN NOT NULL,
    reason       VARCHAR(15) NOT NULL CHECK (reason IN ('ok', 'bad_password', 'unknown_email', 'suspended')),
    source       VARCHAR(3) NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'app')),
    ip_address   INET,
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_events_time ON login_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_events_user ON login_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_events_email ON login_events (email, occurred_at DESC);

CREATE TABLE IF NOT EXISTS admin_user_actions (
    action_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id  UUID REFERENCES users(user_id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    target_email   VARCHAR(255) NOT NULL,
    action         VARCHAR(15) NOT NULL CHECK (action IN ('suspend', 'reactivate', 'revoke_devices')),
    note           VARCHAR(500),
    occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_user_actions_time ON admin_user_actions (occurred_at DESC);

ALTER TABLE provider_sessions DROP CONSTRAINT IF EXISTS provider_sessions_ended_by_check;
ALTER TABLE provider_sessions ADD CONSTRAINT provider_sessions_ended_by_check
    CHECK (ended_by IN ('provider', 'patient', 'replaced', 'admin'));
