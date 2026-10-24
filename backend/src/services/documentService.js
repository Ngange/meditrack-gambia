const pool = require('../config/db');
const model = require('../models/document');
const AppError = require('../utils/AppError');
const { encrypt, decrypt, encryptBuffer, decryptBuffer } = require('./encryption');
const { withPatientLock } = require('./patientService');
const storage = require('./storageService');
const { TYPES, decodeUploadName, detectKind, extensionOf, family, sanitizeFileName } = require('../utils/files');

const MAX_DOCUMENTS = 200;
const { table, selectColumns, orderBy, idCol } = model;

const notFound = () => new AppError(404, 'Document not found.');
// 22P02 = the id in the URL is not a valid UUID, so no such document exists.
const asNotFound = (err) => {
  throw err.code === '22P02' ? notFound() : err;
};

async function list(patientId) {
  const result = await pool.query(
    `SELECT ${selectColumns} FROM ${table} WHERE patient_id = $1 ORDER BY ${orderBy}`,
    [patientId],
  );
  return result.rows.map(model.toDto);
}

// Checks the file is a real PDF or image of an allowed kind, encrypts it, stores it, then records it.
// If recording fails the stored file is removed again, so no orphan files are left behind.
async function upload(patientId, file, details) {
  if (!file) throw new AppError(400, 'Choose a file to upload.');

  const fileName = sanitizeFileName(details.fileName || decodeUploadName(file.originalname));
  if (!fileName) throw new AppError(400, 'That file name is not valid.');

  const ext = extensionOf(fileName);
  if (!TYPES[ext]) throw new AppError(400, 'Only PDF and image files (JPG, PNG, WebP, HEIC) can be uploaded.');
  if (family(detectKind(file.buffer)) !== family(ext)) {
    throw new AppError(400, 'This file does not look like a real ' + ext.toUpperCase() + ' file.');
  }

  const key = await storage.save(encryptBuffer(file.buffer));
  try {
    const row = await withPatientLock(patientId, async (client) => {
      const count = await client.query(`SELECT count(*)::int AS n FROM ${table} WHERE patient_id = $1`, [patientId]);
      if (count.rows[0].n >= MAX_DOCUMENTS) {
        throw new AppError(400, `You can keep up to ${MAX_DOCUMENTS} documents. Delete one to add another.`);
      }
      const result = await client.query(
        `INSERT INTO ${table} (patient_id, document_type, file_name, file_path_enc, description_enc, document_date)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${selectColumns}`,
        [patientId, details.documentType, fileName, encrypt(key), encrypt(details.description), details.documentDate],
      );
      return result.rows[0];
    });
    return model.toDto(row);
  } catch (err) {
    await storage.remove(key).catch(() => {});
    throw err;
  }
}

async function findRow(patientId, id) {
  try {
    const result = await pool.query(
      `SELECT ${selectColumns} FROM ${table} WHERE ${idCol} = $1 AND patient_id = $2`,
      [id, patientId],
    );
    if (!result.rows[0]) throw notFound();
    return result.rows[0];
  } catch (err) {
    return asNotFound(err);
  }
}

// The decrypted file with the details needed to send it.
async function download(patientId, id) {
  const row = await findRow(patientId, id);
  const bytes = decryptBuffer(await storage.read(decrypt(row.file_path_enc)));
  return { fileName: row.file_name, contentType: TYPES[extensionOf(row.file_name)] || 'application/octet-stream', bytes };
}

// Edits the details only (type, description, shown name). The file itself never changes.
// The shown name must keep the same kind of extension so it still matches the stored bytes.
async function updateDetails(patientId, id, details) {
  const row = await findRow(patientId, id);
  const fileName = details.fileName || row.file_name;
  if (family(extensionOf(fileName)) !== family(extensionOf(row.file_name))) {
    throw new AppError(400, `The file name must keep its .${extensionOf(row.file_name)} ending.`);
  }
  const result = await pool.query(
    `UPDATE ${table} SET document_type = $1, file_name = $2, description_enc = $3, document_date = $4
     WHERE ${idCol} = $5 AND patient_id = $6 RETURNING ${selectColumns}`,
    [details.documentType, fileName, encrypt(details.description), details.documentDate, id, patientId],
  );
  return model.toDto(result.rows[0]);
}

async function remove(patientId, id) {
  const row = await findRow(patientId, id);
  await pool.query(`DELETE FROM ${table} WHERE ${idCol} = $1 AND patient_id = $2`, [id, patientId]);
  // The record is gone; a leftover file that cannot be removed is logged, not shown to the patient.
  await storage.remove(decrypt(row.file_path_enc)).catch((err) => console.error('Could not remove stored file:', err));
}

module.exports = { list, upload, download, updateDetails, remove, MAX_DOCUMENTS };
