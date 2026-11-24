const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/providerSessionService');
const audit = require('../services/auditService');
const documentService = require('../services/documentService');
const visitBundleService = require('../services/visitBundleService');
const createRecordService = require('../services/recordService');

// Opening and ending a patient, from the doctor's side.
module.exports = {
  open: asyncHandler('Could not open the record.', async (req, res) => {
    const session = await service.open({
      providerId: req.providerId,
      userId: req.user.userId,
      code: req.body?.code,
      pin: req.body?.pin,
      ip: req.ip,
    });
    res.status(201).json({ session });
  }),

  list: asyncHandler('Could not load your open records.', async (req, res) => {
    res.json({ sessions: await service.listActive(req.providerId) });
  }),

  // The session and the patient's basics, read each time the doctor's page loads.
  get: asyncHandler('Could not load the patient.', async (req, res) => {
    const patient = await service.getPatientBasics(req.patientId);
    await audit.record({ patientId: req.patientId, actorType: 'provider', actorId: req.user.userId, action: 'view', recordType: 'patient_profile', ip: req.ip });
    res.json({ session: { session_id: req.session.session_id, started_at: req.session.started_at, expires_at: req.session.expires_at }, patient });
  }),

  end: asyncHandler('Could not end access.', async (req, res) => {
    await service.end(req.providerId, req.params.sid);
    res.json({ ended: true });
  }),

  // Read-only: the files a patient has stored.
  documents: asyncHandler('Could not load documents.', async (req, res) => {
    await audit.record({ patientId: req.patientId, actorType: 'provider', actorId: req.user.userId, action: 'view', recordType: 'documents', ip: req.ip });
    res.json({ documents: await documentService.list(req.patientId) });
  }),

  download: asyncHandler('Could not open the document.', async (req, res) => {
    const { fileName, contentType, bytes } = await documentService.download(req.patientId, req.params.id);
    await audit.record({ patientId: req.patientId, actorType: 'provider', actorId: req.user.userId, action: 'view', recordType: 'documents', ip: req.ip });
    res.set({
      'Content-Type': contentType,
      'Content-Length': bytes.length,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    res.send(bytes);
  }),

  // A visit with its diagnoses, prescriptions and tests, saved together under the doctor's name.
  createVisitBundle: asyncHandler('Could not save the visit.', async (req, res) => {
    const result = await visitBundleService.createWithRecords(req.patientId, req.valid, req.providerId);
    await audit.record({ patientId: req.patientId, actorType: 'provider', actorId: req.user.userId, action: 'create', recordType: 'visits', ip: req.ip });
    res.status(201).json(result);
  }),

  linked: asyncHandler('Could not load the visit.', async (req, res) => {
    await audit.record({ patientId: req.patientId, actorType: 'provider', actorId: req.user.userId, action: 'view', recordType: 'visits', ip: req.ip });
    res.json(await visitBundleService.getLinked(req.patientId, req.params.id));
  }),
};

// One record type for a doctor: list, add, and edit what they entered. There is no delete.
module.exports.recordController = function recordController(model) {
  const service = createRecordService(model);
  const { name, plural } = model;
  const log = (req, action) =>
    audit.record({ patientId: req.patientId, actorType: 'provider', actorId: req.user.userId, action, recordType: plural, ip: req.ip });

  return {
    list: asyncHandler(`Could not load ${plural}.`, async (req, res) => {
      await log(req, 'view');
      res.json({ [plural]: await service.list(req.patientId) });
    }),
    create: asyncHandler(`Could not save ${name}.`, async (req, res) => {
      const item = await service.create(req.patientId, req.valid, req.providerId);
      await log(req, 'create');
      res.status(201).json({ [name]: item });
    }),
    createMany: asyncHandler(`Could not save ${plural}.`, async (req, res) => {
      const items = await service.createMany(req.patientId, req.valid, req.providerId);
      await log(req, 'create');
      res.status(201).json({ [plural]: items });
    }),
    update: asyncHandler(`Could not update ${name}.`, async (req, res) => {
      const item = await service.update(req.patientId, req.params.id, req.valid, { providerId: req.providerId });
      await log(req, 'update');
      res.json({ [name]: item });
    }),
  };
};
