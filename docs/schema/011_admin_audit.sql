-- A permanent record of every decision an administrator makes about a doctor (verify, reject, change of mind).
-- Kept apart from audit_logs, which is about patients' records. Safe to run more than once.
CREATE TABLE IF NOT EXISTS admin_audit (
    audit_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id   UUID REFERENCES users(user_id) ON DELETE SET NULL,
    provider_id     UUID NOT NULL REFERENCES provider_profile(provider_id) ON DELETE CASCADE,
    previous_status VARCHAR(10) NOT NULL CHECK (previous_status IN ('pending', 'verified', 'rejected')),
    decision        VARCHAR(10) NOT NULL CHECK (decision IN ('verified', 'rejected')),
    note            VARCHAR(500),
    decided_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_decided ON admin_audit (decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_provider ON admin_audit (provider_id, decided_at DESC);
