// One-off: encrypts the clinic name on visits and lab results saved before it was encrypted.
//   node scripts/encrypt-facility-names.js
// Run migration 007 first. Safe to run again: it only touches rows that still hold a plain name.
// The rows' "last updated" times are left as they were.
const pool = require('../src/config/db');
const { encrypt } = require('../src/services/encryption');

const TABLES = [
  { table: 'medical_visits', idCol: 'visit_id' },
  { table: 'laboratory_results', idCol: 'result_id' },
];

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const { table, idCol } of TABLES) {
      // The updated_at trigger would stamp every row with "now"; switch it off for this transaction.
      const trg = await client.query(
        `SELECT tgname FROM pg_trigger WHERE tgrelid = $1::regclass AND NOT tgisinternal AND tgname LIKE '%updated_at'`,
        [table],
      );
      for (const { tgname } of trg.rows) await client.query(`ALTER TABLE ${table} DISABLE TRIGGER ${tgname}`);

      const { rows } = await client.query(
        `SELECT ${idCol} AS id, facility_name FROM ${table} WHERE facility_name IS NOT NULL AND facility_name_enc IS NULL`,
      );
      for (const r of rows) {
        await client.query(`UPDATE ${table} SET facility_name_enc = $2, facility_name = NULL WHERE ${idCol} = $1`, [r.id, encrypt(r.facility_name)]);
      }
      for (const { tgname } of trg.rows) await client.query(`ALTER TABLE ${table} ENABLE TRIGGER ${tgname}`);
      console.log(`${table}: encrypted ${rows.length} clinic name${rows.length === 1 ? '' : 's'}.`);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Nothing was changed. Error:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
