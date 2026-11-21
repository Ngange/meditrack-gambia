const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/shareService');

// The public side: whoever holds a valid link. No login, so nothing here may be cached or indexed.
const privateResponse = (res) => res.set({ 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' });

module.exports = {
  view: asyncHandler('Could not open this link.', async (req, res) => {
    const data = await service.open(req.params.token, req.ip);
    privateResponse(res).json(data);
  }),

  file: asyncHandler('Could not open the document.', async (req, res) => {
    const { fileName, contentType, bytes } = await service.openDocument(req.params.token, req.params.id, req.ip);
    privateResponse(res).set({
      'Content-Type': contentType,
      'Content-Length': bytes.length,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(bytes);
  }),
};
