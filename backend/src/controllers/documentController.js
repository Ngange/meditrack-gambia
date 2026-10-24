const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/documentService');

// Controllers only deal with HTTP. Upload details were validated by the validate middleware (req.valid);
// the file itself comes from multer (req.file).
module.exports = {
  list: asyncHandler('Could not load documents.', async (req, res) => {
    res.json({ documents: await service.list(req.patientId) });
  }),

  upload: asyncHandler('Could not save the document.', async (req, res) => {
    const document = await service.upload(req.patientId, req.file, req.valid);
    res.status(201).json({ document });
  }),

  download: asyncHandler('Could not open the document.', async (req, res) => {
    const { fileName, contentType, bytes } = await service.download(req.patientId, req.params.id);
    res.set({
      'Content-Type': contentType,
      'Content-Length': bytes.length,
      // attachment + an encoded name: the browser or app saves it, and the name cannot break the header.
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    res.send(bytes);
  }),

  update: asyncHandler('Could not update the document.', async (req, res) => {
    res.json({ document: await service.updateDetails(req.patientId, req.params.id, req.valid) });
  }),

  remove: asyncHandler('Could not delete the document.', async (req, res) => {
    await service.remove(req.patientId, req.params.id);
    res.json({ deleted: true });
  }),
};
