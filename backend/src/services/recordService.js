const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { withPatientLock } = require('./patientService');

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
      `SELECT ${selectColumns} FROM ${table}
       WHERE patient_id = $1 ORDER BY ${orderBy}`,
      [patientId],
    );
    return result.rows.map(model.toDto);
  }

  async function create(patientId, value) {
    const row = await withPatientLock(patientId, async (client) => {
      if (await isDuplicate(client, patientId, value, null)) {
        throw new AppError(409, duplicate.message);
      }
      const placeholders = columns.map((_, i) => `$${i + 2}`).join(', ');
      const result = await client.query(
        `INSERT INTO ${table} (patient_id, ${columns.join(', ')})
         VALUES ($1, ${placeholders})
         RETURNING ${selectColumns}`,
        [patientId, ...columns.map((c) => fields[c](value))],
      );
      return result.rows[0];
    });
    return model.toDto(row);
  }

  // Saves several records in one go (for example every result of one blood panel).
  // All or nothing: if any row is a duplicate, nothing is saved. Rows are numbered from 1 in errors.
  async function createMany(patientId, values) {
    const rows = await withPatientLock(patientId, async (client) => {
      const seen = new Set();
      const saved = [];
      for (const [i, value] of values.entries()) {
        const scope = `${JSON.stringify(duplicate.params(value))}|${duplicate.keyOfValue(value)}`;
        if (seen.has(scope)) {
          throw new AppError(409, `Row ${i + 1}: this ${model.label.toLowerCase()} is listed twice.`);
        }
        seen.add(scope);
        if (await isDuplicate(client, patientId, value, null)) {
          throw new AppError(409, `Row ${i + 1}: ${duplicate.message}`);
        }
        const placeholders = columns.map((_, k) => `$${k + 2}`).join(', ');
        const result = await client.query(
          `INSERT INTO ${table} (patient_id, ${columns.join(', ')})
           VALUES ($1, ${placeholders})
           RETURNING ${selectColumns}`,
          [patientId, ...columns.map((c) => fields[c](value))],
        );
        saved.push(result.rows[0]);
      }
      return saved;
    });
    return rows.map(model.toDto);
  }

  async function update(patientId, id, value) {
    try {
      const row = await withPatientLock(patientId, async (client) => {
        if (await isDuplicate(client, patientId, value, id)) {
          throw new AppError(409, duplicate.message);
        }
        const sets = columns.map((c, i) => `${c} = $${i + 1}`).join(', ');
        const n = columns.length;
        // patient_id in the WHERE clause is what stops one patient editing another's row.
        const result = await client.query(
          `UPDATE ${table} SET ${sets}
           WHERE ${idCol} = $${n + 1} AND patient_id = $${n + 2}
           RETURNING ${selectColumns}`,
          [...columns.map((c) => fields[c](value)), id, patientId],
        );
        return result.rows[0];
      });
      if (!row) throw notFound();
      return model.toDto(row);
    } catch (err) {
      return asNotFound(err);
    }
  }

  async function remove(patientId, id) {
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

  return { list, create, createMany, update, remove };
}

module.exports = createRecordService;
