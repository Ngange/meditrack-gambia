import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../../api/client';
import { providerApi } from '../../api/provider';
import { decodeQr, decodeQrFile, secretFromScan } from './scanQr';

// A verified doctor scans a patient's permanent QR and gets an hour with that patient, same as with a PIN.
// The camera needs a secure page (https, or localhost); the photo option works anywhere.
export function ScanQrCard() {
  const navigate = useNavigate();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);
  const busy = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);

  const stop = useCallback(() => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setScanning(false);
  }, []);
  useEffect(() => stop, [stop]);

  const openWith = useCallback(
    async (text: string | null) => {
      if (busy.current) return;
      const secret = text ? secretFromScan(text) : null;
      if (!secret) {
        setError(text ? 'That QR code is not a MediTrack patient code.' : 'No QR code found in that picture. Try again, closer and in better light.');
        return;
      }
      busy.current = true;
      stop();
      setOpening(true);
      setError('');
      try {
        const session = await providerApi.openByQr(secret);
        navigate(`/patient/${session.session_id}`);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        busy.current = false;
        setOpening(false);
      }
    },
    [navigate, stop],
  );

  // Once the camera is allowed and the video element is on the page, play it and look for a QR a few times a second.
  useEffect(() => {
    if (!scanning) return;
    const v = video.current;
    const media = stream.current;
    if (!v || !media) return;
    v.srcObject = media;
    void v.play().catch(() => {});
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const id = window.setInterval(() => {
      if (!ctx || v.videoWidth === 0) return;
      const scale = Math.min(1, 800 / v.videoWidth);
      canvas.width = Math.round(v.videoWidth * scale);
      canvas.height = Math.round(v.videoHeight * scale);
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const text = decodeQr(img.data, canvas.width, canvas.height);
      if (text) void openWith(text);
    }, 250);
    timer.current = id;
    return () => window.clearInterval(id);
  }, [scanning, openWith]);

  async function start() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This page cannot use the camera (it needs https). Use "Scan a photo" instead.');
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      setScanning(true);
    } catch {
      setError('Could not use the camera. Allow camera access, or use "Scan a photo" instead.');
    }
  }

  async function fromPhoto(file: File | undefined) {
    if (!file) return;
    setError('');
    try {
      await openWith(await decodeQrFile(file));
    } catch {
      setError('Could not read that picture.');
    }
  }

  return (
    <section className="a-card dr-card" aria-label="Scan a patient QR code">
      <h2>Scan a patient's QR code</h2>
      <p className="a-muted">The patient shows their QR code. You get one hour with their record, like with a PIN, and they can see that you scanned it.</p>
      {scanning && (
        <div className="dr-scan">
          <video ref={video} muted playsInline aria-label="Camera view" />
          <p className="a-meta">Hold the QR code inside the picture.</p>
        </div>
      )}
      {error && (
        <p className="a-error" role="alert">
          ⚠ {error}
        </p>
      )}
      <div className="a-actions">
        {scanning ? (
          <button type="button" className="a-btn" onClick={stop}>
            Stop camera
          </button>
        ) : (
          <button type="button" className="a-btn a-btn-primary" onClick={start} disabled={opening}>
            {opening ? 'Opening…' : 'Scan with camera'}
          </button>
        )}
        <label className="a-btn dr-photo">
          Scan a photo
          <input type="file" accept="image/*" hidden onChange={(e) => { void fromPhoto(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      </div>
    </section>
  );
}
