import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

// A QR code for any text, drawn as an image. Medium error correction so a slightly dirty printout still scans.
export function QrCode({ value, size = 220, label }: { value: string; size?: number; label: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(value, { margin: 2, width: size * 2, errorCorrectionLevel: 'M', color: { dark: '#111827', light: '#ffffff' } }).then(
      (url) => live && setSrc(url),
      () => live && setSrc(''),
    );
    return () => {
      live = false;
    };
  }, [value, size]);
  if (!src) return <div style={{ width: size, height: size }} aria-hidden />;
  return <img src={src} width={size} height={size} alt={label} style={{ display: 'block', background: '#fff', borderRadius: 8 }} />;
}
