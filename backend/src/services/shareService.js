const pool = require('../config/db');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { generateToken, hashToken, looksLikeToken } = require('../utils/shareToken');
const models = require('../models');
const createRecordService = require('./recordService');
const documentService = require('./documentService');
const { withPatientLock } = require('./patientService');
const audit = require('./auditService');

const MAX_ACTIVE_LINKS = 20;
const NOT_AVAILABLE = () => new AppError(404, 'This link is not available.');

// A link works while it is not revoked, not expired and (if it has a limit) not used up.
// Evaluated against the clock on every request, so it never depends on a stored status being up to date.
const IS_ACTIVE = `revoked_at IS NULL AND expires_at > now() AND (max_views IS NULL OR view_count < max_views)`;

const toDto = (row) => ({
  share_id: row.share_id,
  record_types: row.record_types,
  granted_at: row.granted_at,
  expires_at: row.expires_at,
  revoked_at: row.revoked_at,
  status: row.status,
  view_count: row.view_count,
  last_viewed_at: row.last_viewed_at,
});

// Makes a link. The secret is returned ONCE here and never stored, only its hash.
async function create(patientId, { recordTypes, seconds }) {
  const token = generateToken();
  const row = await withPatientLock(patientId, async (client) => {
    const active = await client.query(
      `SELECT count(*)::int AS n FROM record_shares WHERE patient_id = $1 AND ${IS_ACTIVE}`,
      [patientId],
    );
    if (active.rows[0].n >= MAX_ACTIVE_LINKS) {
      throw new AppError(400, `You can have up to ${MAX_ACTIVE_LINKS} active links. Revoke one to make another.`);
    }
    const result = await client.query(
      `INSERT INTO record_shares (patient_id, token_hash, record_types, expires_at)
       VALUES ($1, $2, $3, now() + make_interval(secs => $4))
       RETURNING share_id, record_types, granted_at, expires_at, revoked_at, view_count`,
      [patientId, hashToken(token), recordTypes, seconds],
    );
    return result.rows[0];
  });
  return {
    share: toDto({ ...row, status: 'active', last_viewed_at: null }),
    token,
    url: `${env.publicWebUrl}/s/${token}`,
  };
}

// The patient's links, newest first, with whether each still works and how often it was opened.
async function list(patientId) {
  // Keep the stored status honest for anything else that reads the table.
  await pool.query(
    `UPDATE record_shares SET status = 'expired'
     WHERE patient_id = $1 AND status = 'active' AND revoked_at IS NULL AND expires_at <= now()`,
    [patientId],
  );
  const result = await pool.query(
    `SELECT s.share_id, s.record_types, s.granted_at, s.expires_at, s.revoked_at, s.view_count,
            CASE WHEN s.revoked_at IS NOT NULL THEN 'revoked'
                 WHEN s.expires_at <= now() OR (s.max_views IS NOT NULL AND s.view_count >= s.max_views) THEN 'expired'
                 ELSE 'active' END AS status,
            (SELECT max(a.occurred_at) FROM audit_logs a
              WHERE a.share_id = s.share_id AND a.record_type = 'share_page') AS last_viewed_at
     FROM record_shares s
     WHERE s.patient_id = $1
     ORDER BY s.granted_at DESC`,
    [patientId],
  );
  return result.rows.map(toDto);
}

// Stops a link working right now. Revoking twice is harmless.
async function revoke(patientId, shareId) {
  const result = await pool
    .query(
      `UPDATE record_shares
       SET revoked_at = COALESCE(revoked_at, now()), status = 'revoked'
       WHERE share_id = $1 AND patient_id = $2
       RETURNING share_id`,
      [shareId, patientId],
    )
    .catch((err) => {
      if (err.code === '22P02') return { rows: [] };
      throw err;
    });
  if (result.rows.length === 0) throw new AppError(404, 'Link not found.');
}

// Documents have their own service (files); every other record type uses the generic one.
const services = Object.fromEntries(models.filter((m) => m.fields).map((m) => [m.plural, createRecordService(m)]));
const SECTION_LOADERS = {
  allergies: (id) => services.allergies.list(id),
  conditions: (id) => services.conditions.list(id),
  visits: (id) => services.visits.list(id),
  medications: (id) => services.medications.list(id),
  lab_results: (id) => services.lab_results.list(id),
  documents: (id) => documentService.list(id),
};

// Opens a link: counts the view, writes the audit line, and returns what the patient chose to share.
// Anything wrong with the link (unknown, expired, revoked, used up) gives the same answer, so
// nobody can tell a real-but-dead link from a made-up one.
async function open(token, ip) {
  if (!looksLikeToken(token)) throw NOT_AVAILABLE();

  const opened = await pool.query(
    `UPDATE record_shares SET view_count = view_count + 1
     WHERE token_hash = $1 AND ${IS_ACTIVE}
     RETURNING share_id, patient_id, record_types, expires_at`,
    [hashToken(token)],
  );
  if (opened.rows.length === 0) throw NOT_AVAILABLE();
  const share = opened.rows[0];

  await audit.record({ patientId: share.patient_id, shareId: share.share_id, actorType: 'share_token', action: 'view', recordType: 'share_page', ip });

  const profile = await pool.query(
    `SELECT first_name, last_name, blood_group, emergency_contact_name, emergency_contact_phone
     FROM patient_profile WHERE patient_id = $1`,
    [share.patient_id],
  );
  const p = profile.rows[0];
  // Name and blood group are always shown (the reader must know whose record it is);
  // the emergency contact only when the patient ticked it.
  const patient = { first_name: p.first_name, last_name: p.last_name, blood_group: p.blood_group };
  if (share.record_types.includes('emergency_contact')) {
    patient.emergency_contact_name = p.emergency_contact_name;
    patient.emergency_contact_phone = p.emergency_contact_phone;
  }

  const sections = {};
  for (const type of share.record_types) {
    if (SECTION_LOADERS[type]) sections[type] = await SECTION_LOADERS[type](share.patient_id);
  }
  return { patient, expires_at: share.expires_at, record_types: share.record_types, sections };
}

// A document file from a shared page. Only if the link includes documents, and only the patient's own.
async function openDocument(token, documentId, ip) {
  if (!looksLikeToken(token)) throw NOT_AVAILABLE();
  const found = await pool.query(
    `SELECT share_id, patient_id, record_types FROM record_shares WHERE token_hash = $1 AND ${IS_ACTIVE}`,
    [hashToken(token)],
  );
  const share = found.rows[0];
  if (!share || !share.record_types.includes('documents')) throw NOT_AVAILABLE();

  const file = await documentService.download(share.patient_id, documentId);
  await audit.record({ patientId: share.patient_id, shareId: share.share_id, actorType: 'share_token', action: 'view', recordType: 'documents', ip });
  return file;
}

module.exports = { create, list, revoke, open, openDocument, MAX_ACTIVE_LINKS };
