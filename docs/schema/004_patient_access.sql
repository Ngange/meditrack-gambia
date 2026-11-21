-- Lets a doctor with an account open a patient's record: the doctor types the patient's short code
-- and the PIN the patient chose. The code is just a lookup name (it can be read out loud); the PIN is
-- the secret, and only a hash of it is stored. Five wrong PINs lock doctor access to that patient
-- for 30 minutes; the patient can end the lockout early by choosing a new PIN.
-- Safe to run more than once.
ALTER TABLE patient_profile ADD COLUMN IF NOT EXISTS patient_code      VARCHAR(20);
ALTER TABLE patient_profile ADD COLUMN IF NOT EXISTS pin_hash          TEXT;
ALTER TABLE patient_profile ADD COLUMN IF NOT EXISTS pin_set_at        TIMESTAMPTZ;
ALTER TABLE patient_profile ADD COLUMN IF NOT EXISTS pin_failed_count  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE patient_profile ADD COLUMN IF NOT EXISTS pin_locked_until  TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_profile_code ON patient_profile(patient_code);

-- Every PIN try, right or wrong, so the patient can see who tried to open their record.
-- provider_id is filled in once doctor accounts exist.
CREATE TABLE IF NOT EXISTS pin_attempts (
    attempt_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id    UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
    provider_id   UUID,
    succeeded     BOOLEAN NOT NULL,
    ip_address    INET,
    attempted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pin_attempts_patient ON pin_attempts(patient_id, attempted_at DESC);
