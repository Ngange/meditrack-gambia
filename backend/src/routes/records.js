const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const requirePatient = require('../middleware/requirePatient');
const validate = require('../middleware/validate');
const createRecordService = require('../services/recordService');
const createRecordController = require('../controllers/recordController');
const documentController = require('../controllers/documentController');
const upload = require('../middleware/upload');
const summaryController = require('../controllers/summaryController');

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
const { validateDocumentDetails } = require('../validators/documentValidator');
const { validateLabResult, validateLabBatch } = require('../validators/labResultValidator');

const router = express.Router();

// Every records route needs a logged-in patient. Admins have no record access.
// requirePatient resolves req.patientId from the token, never from the client.
router.use(requireAuth, requireRole('patient'), requirePatient);

// GET / POST / PUT / DELETE for one record type.
function mountRecords(path, model, validator, batchValidator) {
  const controller = createRecordController(model, createRecordService(model));
  const check = validate(validator);
  const r = express.Router();
  r.get('/', controller.list);
  r.post('/', check, controller.create);
  if (batchValidator) r.post('/batch', validate(batchValidator), controller.createMany);
  r.put('/:id', check, controller.update);
  r.delete('/:id', controller.remove);
  router.use(path, r);
}

mountRecords('/allergies', models.allergy, validateAllergy);
mountRecords('/conditions', models.condition, validateCondition);
mountRecords('/visits', models.visit, validateVisit);
mountRecords('/medications', models.medication, validateMedication);
mountRecords('/lab-results', models.labResult, validateLabResult, validateLabBatch);

// Documents: files kept encrypted outside the database. Upload is multipart (field "file").
const documents = express.Router();
documents.get('/', documentController.list);
documents.post('/', upload, validate(validateDocumentDetails), documentController.upload);
documents.get('/:id/file', documentController.download);
documents.put('/:id', validate(validateDocumentDetails), documentController.update);
documents.delete('/:id', documentController.remove);
router.use('/documents', documents);

// Dashboard counts for every record type (see models/index.js).
router.get('/summary', summaryController.getSummary);

module.exports = router;
