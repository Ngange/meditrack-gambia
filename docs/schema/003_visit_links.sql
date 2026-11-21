-- Links the things a visit produces back to the visit: the diagnosis (condition), the prescription
-- (medication), the tests (lab results) and the paperwork (documents). The link is optional, because
-- plenty of records have no visit behind them (a long-term medicine, an old prescription, an outside lab).
-- If a visit is deleted the records stay and simply become unlinked (ON DELETE SET NULL).
-- Safe to run more than once.
ALTER TABLE medical_conditions  ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES medical_visits(visit_id) ON DELETE SET NULL;
ALTER TABLE medications         ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES medical_visits(visit_id) ON DELETE SET NULL;
ALTER TABLE laboratory_results  ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES medical_visits(visit_id) ON DELETE SET NULL;
ALTER TABLE medical_documents   ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES medical_visits(visit_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conditions_visit ON medical_conditions(visit_id);
CREATE INDEX IF NOT EXISTS idx_medications_visit ON medications(visit_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_visit ON laboratory_results(visit_id);
CREATE INDEX IF NOT EXISTS idx_documents_visit ON medical_documents(visit_id);
