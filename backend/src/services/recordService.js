const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { withPatientLock } = require('./patientService');
const { assertVisitOwned } = require('./visitLink');

// Builds list / create / update / remove for any record type from its model.
// Table and column names come from the model files (constants in our code),
// never from user input, so building SQL text from them is safe.
function createRecordService(model) {
  const { table, idCol, selectColumns, orderBy, fields, duplicate } = model;
  const columns = Object.keys(fields);
  const notFound = () => new AppError(404, `${model.label} not found.`);

  // 22P02 = the id in the URL is not a valid UUID, so no such record can exist.
  const asNotFound = (err) => {
    throw err.code === '22P02' ? notFound() : err;
  };

  // Adds who entered each record (a doctor, or nobody if the patient did) so the patient can see it
  // and a doctor's page knows which ones are theirs to edit.
  async function decorate(db, rows) {
    const dtos = rows.map(model.toDto);
    const ids = [...new Set(rows.map((r) => r.entered_by_provider).filter(Boolean))];
    const labels = new Map();
    if (ids.length) {
      const found = await db.query(
        'SELECT provider_id, first_name, last_name, facility_name FROM provider_profile WHERE provider_id = ANY($1::uuid[])',
        [ids],
      );
      for (const p of found.rows) labels.set(p.provider_id, { provider_id: p.provider_id, name: `Dr ${p.first_name} ${p.last_name}`, facility: p.facility_name });
    }
    return dtos.map((dto, i) => {
      const id = rows[i].entered_by_provider;
      return { ...dto, entered_by: id ? (labels.get(id) ?? { provider_id: id, name: 'a doctor', facility: null }) : null };
    });
  }

  const conflictError = () => Object.assign(new AppError(409, `This ${model.label.toLowerCase()} was changed somewhere else.`), { syncConflict: true });

  const duplicateError = (providerId) =>
    new AppError(409, providerId ? "This is already in the patient's records." : duplicate.message);

  async function isDuplicate(client, patientId, value, excludeId) {
    const result = await client.query(
      `SELECT ${idCol}, ${duplicate.columns} FROM ${table}
       WHERE patient_id = $1 ${duplicate.where}`,
      [patientId, ...duplicate.params(value)],
    );
    const target = duplicate.keyOfValue(value);
    const skip = excludeId ? String(excludeId).toLowerCase() : null;
    return result.rows.some(
      (r) =>
        String(r[idCol]).toLowerCase() !== skip &&
        duplicate.keyOfRow(r) === target,
    );
  }

  async function list(patientId) {
    const result = await pool.query(
      `SELECT ${selectColumns}, entered_by_provider FROM ${table}
       WHERE patient_id = $1 ORDER BY ${orderBy}`,
      [patientId],
    );
    return decorate(pool, result.rows);
  }

  // Inserts one record inside a transaction the caller already holds (with the patient lock).
  // create() uses it, and so does saving a visit together with its records.
  // providerId is set when a doctor is entering the record; it is stored on the row.
  // id is set when a phone created the record offline and chose its id (so a retried upload cannot
  // make a second copy).
  async function insertIn(client, patientId, value, providerId = null, id = null) {
    if (model.linksToVisit) await assertVisitOwned(client, patientId, value.visitId);
    if (await isDuplicate(client, patientId, value, null)) {
      throw duplicateError(providerId);
    }
    const cols = [...(id ? [idCol] : []), ...columns, ...(providerId ? ['entered_by_provider'] : [])];
    const placeholders = cols.map((_, i) => `$${i + 2}`).join(', ');
    const result = await client.query(
      `INSERT INTO ${table} (patient_id, ${cols.join(', ')})
       VALUES ($1, ${placeholders})
       RETURNING ${selectColumns}, entered_by_provider`,
      [patientId, ...(id ? [id] : []), ...columns.map((c) => fields[c](value)), ...(providerId ? [providerId] : [])],
    );
    return (await decorate(client, result.rows))[0];
  }

  async function create(patientId, value, providerId = null) {
    return withPatientLock(patientId, (client) => insertIn(client, patientId, value, providerId));
  }

  // Saves several records in one go (for example every result of one blood panel).
  // All or nothing: if any row is a duplicate, nothing is saved. Rows are numbered from 1 in errors.
  async function createMany(patientId, values, providerId = null) {
    const rows = await withPatientLock(patientId, async (client) => {
      const seen = new Set();
      const saved = [];
      for (const [i, value] of values.entries()) {
        const scope = `${JSON.stringify(duplicate.params(value))}|${duplicate.keyOfValue(value)}`;
        if (seen.has(scope)) {
          throw new AppError(409, `Row ${i + 1}: this ${model.label.toLowerCase()} is listed twice.`);
        }
        seen.add(scope);
        try {
          saved.push(await insertIn(client, patientId, value, providerId));
        } catch (err) {
          if (err instanceof AppError && err.status === 409) throw new AppError(409, `Row ${i + 1}: ${err.message}`);
          throw err;
        }
      }
      return saved;
    });
    return rows;
  }

  // actor.providerId is set when a doctor is editing: they may change only records they entered.
  // A patient may not change a record a doctor entered (they can still delete it).
  // actor.baseVersion is set by offline sync: the version the phone last saw. If the record has
  // changed since, nothing is saved and a conflict error is thrown (see syncService).
  // 422, not 401/403: those make the apps sign the user out.
  async function update(patientId, id, value, actor = null) {
    try {
      const row = await withPatientLock(patientId, async (client) => {
        const current = await client.query(
          `SELECT entered_by_provider${actor?.baseVersion != null ? ', sync_version' : ''} FROM ${table} WHERE ${idCol} = $1 AND patient_id = $2 FOR UPDATE`,
          [id, patientId],
        );
        if (current.rows.length === 0) return undefined;
        if (actor?.baseVersion != null && Number(current.rows[0].sync_version) !== Number(actor.baseVersion)) throw conflictError();
        const by = current.rows[0].entered_by_provider;
        if (actor?.providerId) {
          if (by !== actor.providerId) throw new AppError(422, 'You can only edit records you entered yourself.');
        } else if (by) {
          throw new AppError(422, 'Your doctor entered this record, so it cannot be changed. You can delete it and add your own.');
        }
        if (model.linksToVisit) await assertVisitOwned(client, patientId, value.visitId);
        if (await isDuplicate(client, patientId, value, id)) {
          throw duplicateError(actor?.providerId);
        }
        const sets = columns.map((c, i) => `${c} = $${i + 1}`).join(', ');
        const n = columns.length;
        // patient_id in the WHERE clause is what stops one patient editing another's row.
        const result = await client.query(
          `UPDATE ${table} SET ${sets}
           WHERE ${idCol} = $${n + 1} AND patient_id = $${n + 2}
           RETURNING ${selectColumns}, entered_by_provider`,
          [...columns.map((c) => fields[c](value)), id, patientId],
        );
        return (await decorate(client, result.rows))[0];
      });
      if (!row) throw notFound();
      return row;
    } catch (err) {
      return asNotFound(err);
    }
  }

  // options.baseVersion is set by offline sync: if the record changed after the phone last saw it,
  // it is not deleted and a conflict error is thrown (a change somewhere else wins over a delete).
  async function remove(patientId, id, { baseVersion = null } = {}) {
    if (baseVersion != null) {
      try {
        return await withPatientLock(patientId, async (client) => {
          const current = await client.query(`SELECT sync_version FROM ${table} WHERE ${idCol} = $1 AND patient_id = $2 FOR UPDATE`, [id, patientId]);
          if (current.rows.length === 0) throw notFound();
          if (Number(current.rows[0].sync_version) !== Number(baseVersion)) throw conflictError();
          await client.query(`DELETE FROM ${table} WHERE ${idCol} = $1 AND patient_id = $2`, [id, patientId]);
        });
      } catch (err) {
        return asNotFound(err);
      }
    }
    try {
      const result = await pool.query(
        `DELETE FROM ${table} WHERE ${idCol} = $1 AND patient_id = $2 RETURNING ${idCol}`,
        [id, patientId],
      );
      if (result.rows.length === 0) throw notFound();
    } catch (err) {
      asNotFound(err);
    }
  }

  return { list, create, createMany, insertIn, update, remove, decorate };
}

module.exports = createRecordService;
