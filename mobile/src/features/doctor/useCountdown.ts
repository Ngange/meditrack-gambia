import { useEffect, useState } from 'react';

/** Seconds left until `iso`, ticking once a second. */
export function useCountdown(iso: string | null) {
  const [left, setLeft] = useState(() => (iso ? Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000)) : 0));
  useEffect(() => {
    if (!iso) return;
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [iso]);
  return left;
}

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
