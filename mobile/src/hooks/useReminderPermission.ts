import { useCallback, useEffect, useState } from 'react';

import { getReminderPermission, requestReminderPermission, type ReminderPermission } from '@/services/reminders';

/** Whether the phone lets MediTrack show notifications, and a way to ask. */
export function useReminderPermission() {
  const [permission, setPermission] = useState<ReminderPermission>('granted');

  useEffect(() => {
    let cancelled = false;
    getReminderPermission()
      .then((p) => !cancelled && setPermission(p))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const request = useCallback(async () => {
    try {
      setPermission(await requestReminderPermission());
    } catch {
      // leave the state as it was
    }
  }, []);

  return { permission, request };
}
