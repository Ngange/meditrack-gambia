-- Doctors with accounts. A doctor registers with a licence number and stays "pending" until an
-- admin verifies them; only a verified doctor can open a patient's record (that check is made
-- when PIN access is built). Safe to run more than once.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('patient', 'admin', 'provider'));

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_type_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_actor_type_check
    CHECK (actor_type IN ('patient', 'admin', 'share_token', 'provider'));

CREATE TABLE IF NOT EXISTS provider_profile (
    provider_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    licence_number      VARCHAR(40)  NOT NULL,
    facility_name       VARCHAR(150) NOT NULL,
    specialty           VARCHAR(100),
    verification_status VARCHAR(10)  NOT NULL DEFAULT 'pending'
                        CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verification_note   TEXT,
    verified_by         UUID REFERENCES users(user_id) ON DELETE SET NULL,
    verified_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One account per licence, whatever the capitalisation or spacing.
CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_licence ON provider_profile (upper(licence_number));
CREATE INDEX IF NOT EXISTS idx_provider_status ON provider_profile (verification_status);

DROP TRIGGER IF EXISTS trg_provider_profile_updated_at ON provider_profile;
CREATE TRIGGER trg_provider_profile_updated_at
    BEFORE UPDATE ON provider_profile
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- The PIN log can now say which doctor tried.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pin_attempts_provider_fk') THEN
        ALTER TABLE pin_attempts
            ADD CONSTRAINT pin_attempts_provider_fk
            FOREIGN KEY (provider_id) REFERENCES provider_profile(provider_id) ON DELETE SET NULL;
    END IF;
END $$;
