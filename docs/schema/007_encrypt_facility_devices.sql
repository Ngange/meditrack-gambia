-- 1. The clinic named on a visit or a lab result now has an encrypted column, like the rest of
--    the clinical fields. The old plain column stays (the patient_timeline view reads it) but new
--    writes leave it empty. Existing rows are moved by `node scripts/encrypt-facility-names.js`.
-- 2. The mobile app is Android only, so the devices table accepts only 'android'. NOT VALID keeps
--    any older row untouched and checks every new one.
-- Safe to run more than once.
ALTER TABLE medical_visits     ADD COLUMN IF NOT EXISTS facility_name_enc TEXT;
ALTER TABLE laboratory_results ADD COLUMN IF NOT EXISTS facility_name_enc TEXT;

ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_platform_check;
ALTER TABLE devices ADD CONSTRAINT devices_platform_check CHECK (platform = 'android') NOT VALID;
