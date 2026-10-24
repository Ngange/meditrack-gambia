// What a patient may upload, and how we check it really is that.
// The type is decided from the file's first bytes, never from what the phone or browser claims.

const TYPES = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const startsWith = (buf, bytes, offset = 0) => bytes.every((b, i) => buf[offset + i] === b);
const ascii = (buf, from, to) => buf.subarray(from, to).toString('latin1');

// Returns 'pdf' | 'jpg' | 'png' | 'webp' | 'heic' or null when the bytes match none of them.
function detectKind(buf) {
  if (buf.length < 12) return null;
  if (ascii(buf, 0, 5) === '%PDF-') return 'pdf';
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'jpg';
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (ascii(buf, 0, 4) === 'RIFF' && ascii(buf, 8, 12) === 'WEBP') return 'webp';
  if (ascii(buf, 4, 8) === 'ftyp' && /^(heic|heix|hevc|hevx|mif1|msf1)$/.test(ascii(buf, 8, 12))) return 'heic';
  return null;
}

const extensionOf = (name) => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');

// Treat jpg/jpeg and heic/heif as the same family when comparing the extension to the bytes.
const family = (kindOrExt) => ({ jpeg: 'jpg', heif: 'heic' })[kindOrExt] || kindOrExt;

// The multipart parser reads file names as Latin-1, but browsers and phones send UTF-8,
// so "Résumé" arrives as "RÃ©sumÃ©". This turns it back (and leaves already-correct names alone).
function decodeUploadName(name) {
  const fixed = Buffer.from(String(name || ''), 'latin1').toString('utf8');
  return fixed.includes('\ufffd') ? name : fixed;
}

// Keeps a readable name but removes anything that could act as a path or break a header.
function sanitizeFileName(raw) {
  const base = String(raw || '')
    .replace(/[\\/]/g, '_')
    .replace(/[\u0000-\u001f\u007f"<>:|?*]/g, '')
    .trim();
  if (!base || base === '.' || base === '..') return null;
  if (base.length <= 255) return base;
  const ext = extensionOf(base);
  const suffix = ext ? `.${ext}` : '';
  return base.slice(0, 255 - suffix.length) + suffix;
}

module.exports = { decodeUploadName, TYPES, MAX_FILE_BYTES, detectKind, extensionOf, family, sanitizeFileName };
