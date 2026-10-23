const asyncHandler = require('../utils/asyncHandler');

// Controllers only deal with HTTP: read the request, call the service, send the response.
// This one serves any record type. Validation already happened in the validate middleware
// (req.valid) and req.patientId was set by requirePatient.
function createRecordController(model, service) {
  const { name, plural } = model;

  return {
    list: asyncHandler(`Could not load ${plural}.`, async (req, res) => {
      res.json({ [plural]: await service.list(req.patientId) });
    }),

    create: asyncHandler(`Could not save ${name}.`, async (req, res) => {
      const item = await service.create(req.patientId, req.valid);
      res.status(201).json({ [name]: item });
    }),

    update: asyncHandler(`Could not update ${name}.`, async (req, res) => {
      const item = await service.update(req.patientId, req.params.id, req.valid);
      res.json({ [name]: item });
    }),

    remove: asyncHandler(`Could not delete ${name}.`, async (req, res) => {
      await service.remove(req.patientId, req.params.id);
      res.json({ deleted: true });
    }),
  };
}

module.exports = createRecordController;
