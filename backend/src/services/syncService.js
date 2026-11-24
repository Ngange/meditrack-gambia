const pool = require('../config/db');
const AppError = require('../utils/AppError');
const createRecordService = require('./recordService');
const deviceService = require('./deviceService');
const profileService = require('./profileService');
const { withPatientLock } = require('./patientService');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// What a phone may create, change and delete offline. Documents are files, so a phone only gets
// their details (read only); uploading or deleting a document needs a connection.
const WRITABLE = {
  allergies: { model: require('../models/allergy'), validate: require('../validators/allergyValidator').validateAllergy },
  conditions: { model: require('../models/condition'), validate: require('../validators/conditionValidator').validateCondition },
  visits: { model: require('../models/visit'), validate: require('../validators/visitValidator').validateVisit },
  medications: { model: require('../models/medication'), validate: require('../validators/medicationValidator').validateMedication },
  lab_results: { model: require('../models/labResult'), validate: require('../validators/labResultValidator').validateLabResult },
};
for (const t of Object.values(WRITABLE)) t.service = createRecordService(t.model);
const documentModel = require('../models/document');

// ---- applying a phone's changes ---------------------------------------------------------------

const STATUS_CODE = { 400: 'invalid', 404: 'not_found', 409: 'duplicate', 422: 'not_allowed' };

// A failed change is reported back, never thrown: one bad change must not block the others.
// "server_error" means something went wrong on our side; the phone should keep the change and retry.
function rejected(err) {
  if (err instanceof AppError) return { status: 'rejected', code: STATUS_CODE[err.status] ?? 'invalid', message: err.message };
  console.error('Sync change failed:', err);
  return { status: 'rejected', code: 'server_error', message: 'Could not save this change. It will be tried again.' };
}

// The record as it is now, with its version, or null.
async function current(patientId, type, id) {
  const { model, service } = WRITABLE[type];
  const { rows } = await pool.query(
    `SELECT ${model.selectColumns}, entered_by_provider, sync_version FROM ${model.table} WHERE ${model.idCol} = $1 AND patient_id = $2`,
    [id, patientId],
  );
  if (!rows[0]) return null;
  return { record: (await service.decorate(pool, rows))[0], version: Number(rows[0].sync_version) };
}

async function tombstoneVersion(type, id) {
  const { rows } = await pool.query('SELECT sync_version FROM record_tombstones WHERE record_type = $1 AND record_id = $2', [type, id]);
  return rows[0] ? Number(rows[0].sync_version) : null;
}

async function applyChange(patientId, change) {
  const out = { id: change?.id, type: change?.type, op: change?.op };
  try {
    if (!change || typeof change !== 'object') return { ...out, ...rejected(new AppError(400, 'Not a valid change.')) };
    if (change.type === 'documents') return { ...out, ...rejected(new AppError(422, 'Documents cannot be changed offline. Do it with a connection.')) };
    const entry = WRITABLE[change.type];
    if (!entry) return { ...out, ...rejected(new AppError(400, 'Unknown record type.')) };
    if (!['create', 'update', 'delete'].includes(change.op)) return { ...out, ...rejected(new AppError(400, 'Unknown operation.')) };
    if (typeof change.id !== 'string' || !UUID.test(change.id)) return { ...out, ...rejected(new AppError(400, 'Not a valid id.')) };
    const id = change.id.toLowerCase();
    out.id = id;
    const { service, model } = entry;

    let value;
    if (change.op !== 'delete') {
      const checked = entry.validate(change.data && typeof change.data === 'object' ? change.data : {});
      if (checked.error) return { ...out, ...rejected(new AppError(400, checked.error)) };
      value = checked.value;
    }
    const baseVersion = change.baseVersion;
    if (change.op !== 'create' && !(Number.isInteger(baseVersion) && baseVersion >= 0)) {
      return { ...out, ...rejected(new AppError(400, 'baseVersion is required.')) };
    }

    if (change.op === 'create') {
      const existing = await current(patientId, change.type, id);
      if (existing) return { ...out, status: 'applied', version: existing.version, record: existing.record }; // a retry of something already saved
      const gone = await tombstoneVersion(change.type, id);
      if (gone != null) return { ...out, status: 'applied', deleted: true, version: gone }; // saved earlier, deleted since
      try {
        await withPatientLock(patientId, async (client) => {
          // Checked again under the lock: the same create may have arrived a moment ago from another request.
          const already = await client.query(`SELECT 1 FROM ${model.table} WHERE ${model.idCol} = $1 AND patient_id = $2`, [id, patientId]);
          if (already.rows.length === 0) await service.insertIn(client, patientId, value, null, id);
        });
      } catch (err) {
        if (err.code === '23505') {
          const again = await current(patientId, change.type, id); // the same create arrived twice at once
          if (again) return { ...out, status: 'applied', version: again.version, record: again.record };
          return { ...out, ...rejected(new AppError(400, 'This id is already in use.')) };
        }
        throw err;
      }
      const saved = await current(patientId, change.type, id);
      return { ...out, status: 'applied', version: saved.version, record: saved.record };
    }

    if (change.op === 'update') {
      const existing = await current(patientId, change.type, id);
      if (!existing) {
        // Deleted somewhere else while the phone edited it: the edit wins, so the record comes back.
        const gone = await tombstoneVersion(change.type, id);
        if (gone == null) return { ...out, ...rejected(new AppError(404, `${model.label} not found.`)) };
        await withPatientLock(patientId, async (client) => {
          await service.insertIn(client, patientId, value, null, id);
          await client.query('DELETE FROM record_tombstones WHERE record_type = $1 AND record_id = $2', [change.type, id]);
        });
        const back = await current(patientId, change.type, id);
        return { ...out, status: 'applied', restored: true, version: back.version, record: back.record };
      }
      try {
        await service.update(patientId, id, value, { baseVersion });
      } catch (err) {
        if (err.syncConflict) {
          const now = await current(patientId, change.type, id);
          return { ...out, status: 'conflict', reason: 'changed_on_server', server_record: now?.record ?? null, server_version: now?.version ?? null };
        }
        throw err;
      }
      const saved = await current(patientId, change.type, id);
      return { ...out, status: 'applied', version: saved.version, record: saved.record };
    }

    // delete
    const existing = await current(patientId, change.type, id);
    if (!existing) return { ...out, status: 'applied', version: await tombstoneVersion(change.type, id) }; // already gone
    try {
      await service.remove(patientId, id, { baseVersion });
    } catch (err) {
      if (err.syncConflict) {
        const now = await current(patientId, change.type, id);
        return { ...out, status: 'conflict', reason: 'changed_on_server', server_record: now?.record ?? null, server_version: now?.version ?? null };
      }
      if (err instanceof AppError && err.status === 404) return { ...out, status: 'applied', version: await tombstoneVersion(change.type, id) };
      throw err;
    }
    return { ...out, status: 'applied', version: await tombstoneVersion(change.type, id) };
  } catch (err) {
    return { ...out, ...rejected(err) };
  }
}

// ---- what changed since the phone last asked ---------------------------------------------------

// Every record created or changed after `since`, and every deletion, oldest first.
// Versions are handed out in commit order and have no gaps (see migration 008), so reading up to the
// counter value we start with can never skip a change, however busy the server is.
async function pull(patientId, since, limit) {
  const counter = await pool.query('SELECT last_version FROM patient_sync_counters WHERE patient_id = $1', [patientId]);
  const upper = counter.rows[0] ? Number(counter.rows[0].last_version) : 0;
  // A bookmark ahead of the server means the server's data was reset: start the phone over.
  const reset = since > upper;
  const from = reset ? 0 : since;

  const found = [];
  const readTable = async (type, model, withAuthor, service) => {
    const { rows } = await pool.query(
      `SELECT ${model.selectColumns}${withAuthor ? ', entered_by_provider' : ''}, sync_version FROM ${model.table}
        WHERE patient_id = $1 AND sync_version > $2 AND sync_version <= $3 ORDER BY sync_version LIMIT $4`,
      [patientId, from, upper, limit + 1],
    );
    const dtos = service ? await service.decorate(pool, rows) : rows.map(model.toDto);
    rows.forEach((r, i) => found.push({ version: Number(r.sync_version), type, id: dtos[i][model.idCol], deleted: false, record: dtos[i] }));
  };
  for (const [type, { model, service }] of Object.entries(WRITABLE)) await readTable(type, model, true, service);
  await readTable('documents', documentModel, false, null);

  const gone = await pool.query(
    `SELECT record_type, record_id, sync_version FROM record_tombstones
      WHERE patient_id = $1 AND sync_version > $2 AND sync_version <= $3 ORDER BY sync_version LIMIT $4`,
    [patientId, from, upper, limit + 1],
  );
  for (const r of gone.rows) found.push({ version: Number(r.sync_version), type: r.record_type, id: r.record_id, deleted: true });

  found.sort((a, b) => a.version - b.version);
  const hasMore = found.length > limit;
  const changes = found.slice(0, limit);
  // Nothing more to send: the bookmark moves to the counter we read, so an idle phone stays current.
  const cursor = hasMore ? changes[changes.length - 1].version : upper;
  return { changes, cursor, hasMore, reset };
}

// ---- one sync: send the phone's changes, then everything it is missing ------------------------

async function sync({ userId, patientId, deviceId, cursor, changes, limit }) {
  await deviceService.assertActive(patientId, deviceId);

  const results = [];
  for (const change of changes) results.push(await applyChange(patientId, change));

  const feed = await pull(patientId, cursor, limit);
  const profile = await profileService.getProfile(userId);

  const applied = results.filter((r) => r.status === 'applied').length;
  try {
    await pool.query(
      'INSERT INTO sync_log (device_id, patient_id, records_pushed, records_pulled, sync_status) VALUES ($1, $2, $3, $4, $5)',
      [deviceId, patientId, applied, feed.changes.length, applied === results.length ? 'success' : 'partial'],
    );
  } catch (err) {
    console.error('Could not write sync log:', err.message); // the log must never break a sync
  }

  return { results, ...feed, profile, serverTime: new Date().toISOString() };
}

module.exports = { sync, pull, applyChange };
