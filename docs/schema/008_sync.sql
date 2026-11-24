-- Offline sync support. Safe to run more than once. Runs as one transaction.
--
-- 1. Every record gets a per-patient "sync_version": a number that goes up by one on every create
--    or change of any of that patient's records (whoever made it: the patient, a doctor, the web
--    app, the phone). A phone remembers the highest number it has seen and asks for everything
--    after it. The number is handed out by a trigger, under the patient's counter row lock, so
--    numbers follow commit order and a change can never slip in "behind" a phone's bookmark.
-- 2. Deleting a record leaves a tombstone (type + id + version) so phones learn about deletions.
-- 3. Each phone gets a device key (stored hashed) so it can get a fresh login token by itself
--    after being offline. The key is checked, rotated and expired by the server.
BEGIN;

CREATE TABLE IF NOT EXISTS patient_sync_counters (
    patient_id   UUID PRIMARY KEY REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
    last_version BIGINT NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION next_sync_version(p UUID) RETURNS BIGINT AS $$
    INSERT INTO patient_sync_counters (patient_id, last_version) VALUES (p, 1)
    ON CONFLICT (patient_id) DO UPDATE SET last_version = patient_sync_counters.last_version + 1
    RETURNING last_version;
$$ LANGUAGE sql;

CREATE TABLE IF NOT EXISTS record_tombstones (
    record_type  VARCHAR(20) NOT NULL,
    record_id    UUID NOT NULL,
    patient_id   UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
    sync_version BIGINT NOT NULL,
    deleted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (record_type, record_id)
);
CREATE INDEX IF NOT EXISTS idx_tombstones_patient ON record_tombstones(patient_id, sync_version);

ALTER TABLE allergies           ADD COLUMN IF NOT EXISTS sync_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE medical_conditions  ADD COLUMN IF NOT EXISTS sync_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE medical_visits      ADD COLUMN IF NOT EXISTS sync_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE medications         ADD COLUMN IF NOT EXISTS sync_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE laboratory_results  ADD COLUMN IF NOT EXISTS sync_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE medical_documents   ADD COLUMN IF NOT EXISTS sync_version BIGINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_allergies_sync   ON allergies(patient_id, sync_version);
CREATE INDEX IF NOT EXISTS idx_conditions_sync  ON medical_conditions(patient_id, sync_version);
CREATE INDEX IF NOT EXISTS idx_visits_sync      ON medical_visits(patient_id, sync_version);
CREATE INDEX IF NOT EXISTS idx_medications_sync ON medications(patient_id, sync_version);
CREATE INDEX IF NOT EXISTS idx_lab_results_sync ON laboratory_results(patient_id, sync_version);
CREATE INDEX IF NOT EXISTS idx_documents_sync   ON medical_documents(patient_id, sync_version);

CREATE OR REPLACE FUNCTION stamp_sync_version() RETURNS trigger AS $$
BEGIN
    NEW.sync_version := next_sync_version(NEW.patient_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TG_ARGV[0] = record type name, TG_ARGV[1] = the table's id column.
-- If the whole patient is being deleted the counter/tombstone rows go with them, so skip.
CREATE OR REPLACE FUNCTION record_tombstone() RETURNS trigger AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM patient_profile WHERE patient_id = OLD.patient_id) THEN
        INSERT INTO record_tombstones (record_type, record_id, patient_id, sync_version)
        VALUES (TG_ARGV[0], (to_jsonb(OLD) ->> TG_ARGV[1])::uuid, OLD.patient_id, next_sync_version(OLD.patient_id))
        ON CONFLICT (record_type, record_id)
        DO UPDATE SET sync_version = EXCLUDED.sync_version, deleted_at = now();
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_allergies_sync ON allergies;
CREATE TRIGGER trg_allergies_sync BEFORE INSERT OR UPDATE ON allergies FOR EACH ROW EXECUTE FUNCTION stamp_sync_version();
DROP TRIGGER IF EXISTS trg_conditions_sync ON medical_conditions;
CREATE TRIGGER trg_conditions_sync BEFORE INSERT OR UPDATE ON medical_conditions FOR EACH ROW EXECUTE FUNCTION stamp_sync_version();
DROP TRIGGER IF EXISTS trg_visits_sync ON medical_visits;
CREATE TRIGGER trg_visits_sync BEFORE INSERT OR UPDATE ON medical_visits FOR EACH ROW EXECUTE FUNCTION stamp_sync_version();
DROP TRIGGER IF EXISTS trg_medications_sync ON medications;
CREATE TRIGGER trg_medications_sync BEFORE INSERT OR UPDATE ON medications FOR EACH ROW EXECUTE FUNCTION stamp_sync_version();
DROP TRIGGER IF EXISTS trg_lab_results_sync ON laboratory_results;
CREATE TRIGGER trg_lab_results_sync BEFORE INSERT OR UPDATE ON laboratory_results FOR EACH ROW EXECUTE FUNCTION stamp_sync_version();
DROP TRIGGER IF EXISTS trg_documents_sync ON medical_documents;
CREATE TRIGGER trg_documents_sync BEFORE INSERT OR UPDATE ON medical_documents FOR EACH ROW EXECUTE FUNCTION stamp_sync_version();

DROP TRIGGER IF EXISTS trg_allergies_tombstone ON allergies;
CREATE TRIGGER trg_allergies_tombstone AFTER DELETE ON allergies FOR EACH ROW EXECUTE FUNCTION record_tombstone('allergies', 'allergy_id');
DROP TRIGGER IF EXISTS trg_conditions_tombstone ON medical_conditions;
CREATE TRIGGER trg_conditions_tombstone AFTER DELETE ON medical_conditions FOR EACH ROW EXECUTE FUNCTION record_tombstone('conditions', 'condition_id');
DROP TRIGGER IF EXISTS trg_visits_tombstone ON medical_visits;
CREATE TRIGGER trg_visits_tombstone AFTER DELETE ON medical_visits FOR EACH ROW EXECUTE FUNCTION record_tombstone('visits', 'visit_id');
DROP TRIGGER IF EXISTS trg_medications_tombstone ON medications;
CREATE TRIGGER trg_medications_tombstone AFTER DELETE ON medications FOR EACH ROW EXECUTE FUNCTION record_tombstone('medications', 'medication_id');
DROP TRIGGER IF EXISTS trg_lab_results_tombstone ON laboratory_results;
CREATE TRIGGER trg_lab_results_tombstone AFTER DELETE ON laboratory_results FOR EACH ROW EXECUTE FUNCTION record_tombstone('lab_results', 'result_id');
DROP TRIGGER IF EXISTS trg_documents_tombstone ON medical_documents;
CREATE TRIGGER trg_documents_tombstone AFTER DELETE ON medical_documents FOR EACH ROW EXECUTE FUNCTION record_tombstone('documents', 'document_id');

-- Number the records that existed before this migration (sync_version = 0). The "last updated"
-- triggers are switched off for this so no record's last-updated time changes.
ALTER TABLE allergies           DISABLE TRIGGER trg_allergies_updated_at;
ALTER TABLE medical_conditions  DISABLE TRIGGER trg_medical_conditions_updated_at;
ALTER TABLE medical_visits      DISABLE TRIGGER trg_medical_visits_updated_at;
ALTER TABLE medications         DISABLE TRIGGER trg_medications_updated_at;
ALTER TABLE laboratory_results  DISABLE TRIGGER trg_lab_results_updated_at;

UPDATE allergies           SET sync_version = 0 WHERE sync_version = 0;
UPDATE medical_conditions  SET sync_version = 0 WHERE sync_version = 0;
UPDATE medical_visits      SET sync_version = 0 WHERE sync_version = 0;
UPDATE medications         SET sync_version = 0 WHERE sync_version = 0;
UPDATE laboratory_results  SET sync_version = 0 WHERE sync_version = 0;
UPDATE medical_documents   SET sync_version = 0 WHERE sync_version = 0;

ALTER TABLE allergies           ENABLE TRIGGER trg_allergies_updated_at;
ALTER TABLE medical_conditions  ENABLE TRIGGER trg_medical_conditions_updated_at;
ALTER TABLE medical_visits      ENABLE TRIGGER trg_medical_visits_updated_at;
ALTER TABLE medications         ENABLE TRIGGER trg_medications_updated_at;
ALTER TABLE laboratory_results  ENABLE TRIGGER trg_lab_results_updated_at;

-- Device keys. The key itself is never stored, only its SHA-256. The previous key stays valid for a
-- few minutes after a rotation, so a lost response on a bad connection does not lock the phone out.
ALTER TABLE devices ADD COLUMN IF NOT EXISTS key_hash            TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS prev_key_hash       TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS prev_key_valid_until TIMESTAMPTZ;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS revoked_at          TIMESTAMPTZ;

COMMIT;
