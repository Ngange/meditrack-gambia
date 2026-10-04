-- ============================================================
-- MediTrack Gambia — Database Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- ------------------------------------------------------------
-- trigger to keep updated_at current on every UPDATE
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,               -- Argon2/bcrypt hash
    role            VARCHAR(10) NOT NULL CHECK (role IN ('patient', 'admin')),
    status          VARCHAR(10) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 2. PATIENT_PROFILE
-- One-to-one with a user whose role = 'patient'.
-- Basic identity fields are not encrypted (needed for display,
-- search, and are not the "sensitive medical content" the
-- encryption requirement targets); blood group and emergency
-- contact are left in plaintext for the same reason.
-- ============================================================
CREATE TABLE patient_profile (
    patient_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    date_of_birth       DATE,
    gender              VARCHAR(20),
    blood_group         VARCHAR(3) CHECK (blood_group IN
    ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    emergency_contact_name  VARCHAR(150),
    emergency_contact_phone VARCHAR(30),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_profile_user_id ON patient_profile(user_id);

CREATE TRIGGER trg_patient_profile_updated_at
    BEFORE UPDATE ON patient_profile
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Enforce that a patient_profile row can only reference a user
-- whose role is 'patient'.
-- Runs on INSERT, and again on UPDATE if user_id is ever reassigned.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_patient_role()
RETURNS TRIGGER AS $$
DECLARE
    u_role VARCHAR(10);
BEGIN
    SELECT role INTO u_role FROM users WHERE user_id = NEW.user_id;

    IF u_role IS NULL THEN
        RAISE EXCEPTION 'patient_profile.user_id % does not reference an existing user', NEW.user_id;
    END IF;

    IF u_role <> 'patient' THEN
        RAISE EXCEPTION 'Cannot create patient_profile for user % — role is ''%'', not ''patient''',
            NEW.user_id, u_role;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_patient_role
    BEFORE INSERT OR UPDATE OF user_id ON patient_profile
    FOR EACH ROW EXECUTE FUNCTION enforce_patient_role();


-- ============================================================
-- 3. ALLERGIES
-- ============================================================
CREATE TABLE allergies (
    allergy_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
    allergen_enc    TEXT NOT NULL,      -- encrypted
    reaction_enc    TEXT,               -- encrypted
    severity        VARCHAR(10) CHECK (severity IN ('mild', 'moderate', 'severe')),
    status          VARCHAR(10) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'resolved')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_allergies_patient_id ON allergies(patient_id);

CREATE TRIGGER trg_allergies_updated_at
    BEFORE UPDATE ON allergies
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 4. MEDICAL_CONDITIONS
-- ============================================================
CREATE TABLE medical_conditions (
    condition_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id          UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
    condition_name_enc  TEXT NOT NULL,   -- encrypted
    diagnosis_date       DATE,
    status               VARCHAR(10) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'resolved', 'chronic')),
    notes_enc            TEXT,           -- encrypted
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medical_conditions_patient_id ON medical_conditions(patient_id);

CREATE TRIGGER trg_medical_conditions_updated_at
    BEFORE UPDATE ON medical_conditions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 5. MEDICAL_VISITS
-- ============================================================
CREATE TABLE medical_visits (
    visit_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id        UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
    facility_name     VARCHAR(200),
    visit_date        DATE NOT NULL,
    reason_enc        TEXT,   -- encrypted
    diagnosis_enc     TEXT,   -- encrypted
    treatment_enc     TEXT,   -- encrypted
    notes_enc         TEXT,   -- encrypted
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medical_visits_patient_id ON medical_visits(patient_id);
CREATE INDEX idx_medical_visits_visit_date ON medical_visits(visit_date);

CREATE TRIGGER trg_medical_visits_updated_at
    BEFORE UPDATE ON medical_visits
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 6. MEDICATIONS
-- start_date/end_date/status stay in plaintext because the
-- reminder scheduler needs to query on them directly.
-- ============================================================
CREATE TABLE medications (
    medication_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id           UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
    medication_name_enc  TEXT NOT NULL,  -- encrypted
    dosage_enc            TEXT,           -- encrypted
    frequency_enc          TEXT,           -- encrypted (e.g. "twice daily")
    start_date             DATE NOT NULL,
    end_date                DATE,
    status                   VARCHAR(15) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'discontinued')),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_medications_patient_id ON medications(patient_id);
CREATE INDEX idx_medications_reminder_lookup ON medications(status, start_date, end_date);

CREATE TRIGGER trg_medications_updated_at
    BEFORE UPDATE ON medications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 7. LABORATORY_RESULTS
-- ============================================================
CREATE TABLE laboratory_results (
    result_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id               UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
    test_name_enc             TEXT NOT NULL,  -- encrypted
    test_date                  DATE NOT NULL,
    result_enc                  TEXT,          -- encrypted
    reference_range_enc          TEXT,          -- encrypted
    facility_name                 VARCHAR(200),
    created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lab_results_patient_id ON laboratory_results(patient_id);
CREATE INDEX idx_lab_results_test_date ON laboratory_results(test_date);

CREATE TRIGGER trg_lab_results_updated_at
    BEFORE UPDATE ON laboratory_results
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 8. MEDICAL_DOCUMENTS
-- file_path_enc points to encrypted object storage; the actual
-- file bytes are encrypted at rest outside the database.
-- ============================================================
CREATE TABLE medical_documents (
    document_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id          UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
    document_type         VARCHAR(30) NOT NULL CHECK (document_type IN
    ('prescription', 'lab_report', 'discharge_summary',
    'medical_certificate', 'other')),
    file_name               VARCHAR(255) NOT NULL,
    file_path_enc           TEXT NOT NULL,   -- encrypted storage reference
    description_enc         TEXT,           -- encrypted
    upload_date             TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medical_documents_patient_id ON medical_documents(patient_id);
CREATE INDEX idx_medical_documents_type ON medical_documents(document_type);


-- ============================================================
-- 9. RECORD_SHARES
-- Tokenless sharing: only a hash of the token is stored (never
-- the raw token itself), mirroring password-reset-token best
-- practice. record_types lists which categories are shared.
-- ============================================================
CREATE TABLE record_shares (
    share_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id         UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
    token_hash           TEXT NOT NULL UNIQUE,   -- SHA-256 hash of the share token
    record_types           TEXT[] NOT NULL,        -- e.g. '{medications, lab_results}'
    granted_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at                 TIMESTAMPTZ NOT NULL,
    revoked_at                   TIMESTAMPTZ,
    status                         VARCHAR(10) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'revoked')),
    created_at                       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (expires_at > granted_at)
);

CREATE INDEX idx_record_shares_patient_id ON record_shares(patient_id);
CREATE INDEX idx_record_shares_token_hash ON record_shares(token_hash);
CREATE INDEX idx_record_shares_expires_at ON record_shares(expires_at);


-- ============================================================
-- 10. AUDIT_LOGS
-- Covers both share-link access events and admin/patient
-- account actions. actor_id is NULL when the access came from
-- an anonymous share-token holder (no account exists to log).
-- ============================================================
CREATE TABLE audit_logs (
    log_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id           UUID REFERENCES record_shares(share_id) ON DELETE SET NULL,
    patient_id           UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
    actor_type             VARCHAR(15) NOT NULL CHECK (actor_type IN
    ('patient', 'admin', 'share_token')),
    actor_id                 UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action                     VARCHAR(10) NOT NULL CHECK (action IN
    ('view', 'create', 'update', 'delete')),
    record_type                 VARCHAR(30) NOT NULL,
    ip_address                    INET,
    occurred_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_patient_id ON audit_logs(patient_id, occurred_at DESC);
CREATE INDEX idx_audit_logs_share_id ON audit_logs(share_id);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);


-- ============================================================
-- 11. ENCRYPTION_KEYS
-- One data-encryption key per patient, itself wrapped by a
-- master key held outside the database (env secret or KMS).
-- The DB never stores an unwrapped key.
-- ============================================================
CREATE TABLE encryption_keys (
    key_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id       UUID NOT NULL UNIQUE REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
    wrapped_key         TEXT NOT NULL,     -- patient data key, wrapped by master key
    key_version           INTEGER NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    rotated_at                 TIMESTAMPTZ
);

CREATE INDEX idx_encryption_keys_patient_id ON encryption_keys(patient_id);


-- ============================================================
-- VIEWS
-- ============================================================

-- ------------------------------------------------------------
-- patient_timeline
-- Read-only aggregation of visits, medications, lab results,
-- and documents into a single chronological feed. Nothing is
-- stored here — it is computed fresh on every query, so it can
-- never drift out of sync with the underlying tables.
--
-- summary_encrypted tells the application layer whether the
-- summary column needs decrypting before display: TRUE for
-- visit/medication/lab_result rows (their summary is AES-256
-- ciphertext), FALSE for document rows (file_name is stored
-- in plaintext — only the file path and description are
-- encrypted, per the medical_documents table).
--
-- The GET /timeline endpoint should query this view filtered
-- by patient_id, e.g.:
--   SELECT * FROM patient_timeline WHERE patient_id = $1 ORDER BY event_date DESC;
-- The underlying per-table indexes on patient_id and each date
-- column let Postgres push that filter down into each branch
-- of the UNION ALL rather than scanning every table in full.
-- ------------------------------------------------------------
CREATE VIEW patient_timeline AS
SELECT
    patient_id,
    'visit'::VARCHAR(15)        AS event_type,
    visit_id                     AS source_id,
    visit_date                    AS event_date,
    reason_enc                     AS summary,
    TRUE                             AS summary_encrypted,
    facility_name                     AS location
FROM medical_visits

UNION ALL

SELECT
    patient_id,
    'medication'::VARCHAR(15),
    medication_id,
    start_date,
    medication_name_enc,
    TRUE,
    CAST(NULL AS VARCHAR(200))
FROM medications

UNION ALL

SELECT
    patient_id,
    'lab_result'::VARCHAR(15),
    result_id,
    test_date,
    test_name_enc,
    TRUE,
    facility_name
FROM laboratory_results

UNION ALL

SELECT
    patient_id,
    'document'::VARCHAR(15),
    document_id,
    upload_date::date,
    file_name,
    FALSE,
    CAST(NULL AS VARCHAR(200))
FROM medical_documents;

CREATE TABLE devices (
    device_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
    platform        VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
    device_name     VARCHAR(150),
    push_token      TEXT,
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_devices_patient_id ON devices(patient_id);


CREATE TABLE sync_log (
    sync_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id       UUID NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    patient_id      UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    records_pushed  INTEGER NOT NULL DEFAULT 0,
    records_pulled  INTEGER NOT NULL DEFAULT 0,
    sync_status     VARCHAR(10) NOT NULL DEFAULT 'success'
                        CHECK (sync_status IN ('success', 'partial', 'failed'))
);

CREATE INDEX idx_sync_log_device_id ON sync_log(device_id);
CREATE INDEX idx_sync_log_patient_id ON sync_log(patient_id, synced_at DESC);

ALTER TABLE record_shares
    ADD COLUMN max_views INTEGER,
    ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;
    
-- ============================================================
-- End of schema
-- ============================================================
