const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const requireProvider = require('../middleware/requireProvider');
const requireSession = require('../middleware/requireSession');
const rateLimit = require('../middleware/rateLimit');
const validate = require('../middleware/validate');
const controller = require('../controllers/providerAccessController');

const models = {
  allergy: require('../models/allergy'),
  condition: require('../models/condition'),
  visit: require('../models/visit'),
  medication: require('../models/medication'),
  labResult: require('../models/labResult'),
};
const { validateAllergy } = require('../validators/allergyValidator');
const { validateCondition } = require('../validators/conditionValidator');
const { validateVisit } = require('../validators/visitValidator');
const { validateMedication } = require('../validators/medicationValidator');
const { validateVisitBundle } = require('../validators/visitBundleValidator');
const { validateLabResult, validateLabBatch } = require('../validators/labResultValidator');

const router = express.Router();
router.use(requireAuth, requireRole('provider'), requireProvider);

// Opening a patient. Wrong PINs are also counted per patient (5 locks it); this limit is per IP on top.
router.post('/access', rateLimit({ windowMs: 10 * 60 * 1000, max: 20, onlyFailures: true }), controller.open);
router.post('/access/qr', rateLimit({ windowMs: 10 * 60 * 1000, max: 20, onlyFailures: true }), controller.openQr);
router.get('/sessions', controller.list);

// Ending a session needs no checks beyond ownership, so it works even if the session already ran out,
// and a doctor can always close their own access.
router.delete('/sessions/:sid', controller.end);

// Everything below is about one open session, and so one patient.
router.use('/sessions/:sid', requireSession);
router.get('/sessions/:sid', controller.get);
router.post('/sessions/:sid/print', controller.printed);

// A doctor can read, add, and edit what they entered. There is no delete route on purpose.
function mountRecords(path, model, validator, batchValidator) {
  const c = controller.recordController(model);
  const check = validate(validator);
  const r = express.Router();
  r.get('/', c.list);
  r.post('/', check, c.create);
  if (batchValidator) r.post('/batch', validate(batchValidator), c.createMany);
  r.put('/:id', check, c.update);
  router.use(`/sessions/:sid/records${path}`, r);
}

mountRecords('/allergies', models.allergy, validateAllergy);
mountRecords('/conditions', models.condition, validateCondition);
router.post('/sessions/:sid/records/visits/with-records', validate(validateVisitBundle), controller.createVisitBundle);
router.get('/sessions/:sid/records/visits/:id/linked', controller.linked);
mountRecords('/visits', models.visit, validateVisit);
mountRecords('/medications', models.medication, validateMedication);
mountRecords('/lab-results', models.labResult, validateLabResult, validateLabBatch);

// Documents are read-only for doctors for now.
router.get('/sessions/:sid/records/documents', controller.documents);
router.get('/sessions/:sid/records/documents/:id/file', controller.download);

module.exports = router;
