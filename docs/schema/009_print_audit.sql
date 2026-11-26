-- Lets the audit trail record that a doctor printed a patient's record. Safe to run more than once.
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check
    CHECK (action IN ('view', 'create', 'update', 'delete', 'print'));
