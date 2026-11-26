-- A permanent QR code per patient: a share link that never expires, covers every section, and can be reset.
-- Its secret is not stored; it is worked out from the server's master key, so the QR can be shown again at any time.
ALTER TABLE record_shares
    ADD COLUMN IF NOT EXISTS standing BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS standing_version INTEGER;

-- At most one working permanent QR per patient.
CREATE UNIQUE INDEX IF NOT EXISTS uq_record_shares_standing_active
    ON record_shares (patient_id) WHERE standing AND revoked_at IS NULL;

-- How a doctor opened a patient's record, so the patient's history can say "by scanning your QR code".
ALTER TABLE provider_sessions
    ADD COLUMN IF NOT EXISTS opened_via VARCHAR(3) NOT NULL DEFAULT 'pin' CHECK (opened_via IN ('pin', 'qr'));
