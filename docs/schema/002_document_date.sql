-- The date printed on a document (when a prescription or report was issued), so the timeline can
-- place it correctly even when it is uploaded months later. Optional: older rows stay NULL and the
-- timeline falls back to upload_date for them. Safe to run more than once.
ALTER TABLE medical_documents
  ADD COLUMN IF NOT EXISTS document_date DATE;
