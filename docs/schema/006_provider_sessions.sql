-- A doctor's one-hour access to one patient's record, started by the patient's code and PIN.
-- Ends early if the doctor ends it (or, later, if the patient does). Every request a doctor
-- makes is checked against this table, so a session that has ended or run out stops working
-- at once. Safe to run more than once.
CREATE TABLE IF NOT EXISTS provider_sessions (
    session_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id  UUID NOT NULL REFERENCES provider_profile(provider_id) ON DELETE CASCADE,
    patient_id   UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ NOT NULL,
    ended_at     TIMESTAMPTZ,
    ended_by     VARCHAR(10) CHECK (ended_by IN ('provider', 'patient', 'replaced')),
    ip_address   INET,
    CHECK (expires_at > started_at)
);

CREATE INDEX IF NOT EXISTS idx_provider_sessions_provider ON provider_sessions(provider_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_sessions_patient  ON provider_sessions(patient_id, expires_at DESC);

-- Which doctor wrote a record. Empty means the patient wrote it. If the doctor's account is ever
-- removed the record stays and simply no longer names anyone.
ALTER TABLE allergies           ADD COLUMN IF NOT EXISTS entered_by_provider UUID REFERENCES provider_profile(provider_id) ON DELETE SET NULL;
ALTER TABLE medical_conditions  ADD COLUMN IF NOT EXISTS entered_by_provider UUID REFERENCES provider_profile(provider_id) ON DELETE SET NULL;
ALTER TABLE medical_visits      ADD COLUMN IF NOT EXISTS entered_by_provider UUID REFERENCES provider_profile(provider_id) ON DELETE SET NULL;
ALTER TABLE medications         ADD COLUMN IF NOT EXISTS entered_by_provider UUID REFERENCES provider_profile(provider_id) ON DELETE SET NULL;
ALTER TABLE laboratory_results  ADD COLUMN IF NOT EXISTS entered_by_provider UUID REFERENCES provider_profile(provider_id) ON DELETE SET NULL;
