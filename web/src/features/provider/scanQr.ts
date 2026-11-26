import jsQR from 'jsqr';

// A patient's QR holds an address like https://host/s/<43 characters>. This pulls the secret out of whatever
// was scanned, and says nothing for any other QR code (so a doctor cannot be tricked into sending random text).
const SECRET = /\/s\/([A-Za-z0-9_-]{43})(?:[/?#]|$)/;
export const secretFromScan = (text: string): string | null => SECRET.exec(text)?.[1] ?? null;

/** Reads a QR out of one picture (a camera frame or an uploaded photo). Returns its text, or null. */
export function decodeQr(data: Uint8ClampedArray, width: number, height: number): string | null {
  return jsQR(data, width, height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
}

/** Reads a QR from a photo file. Null when there is none in the picture. */
export async function decodeQrFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const img = ctx.getImageData(0, 0, w, h);
  return decodeQr(img.data, w, h);
}
