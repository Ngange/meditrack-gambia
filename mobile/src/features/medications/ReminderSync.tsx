import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/context/AuthContext';

import { medicationApi } from './api';

/**
 * Keeps reminders fresh without the patient having to open the Medications screen:
 * it re-syncs at sign-in, app start and whenever the app comes back to the foreground,
 * and opens Medications when a reminder is tapped. Renders nothing.
 */
export function ReminderSync() {
  const { user } = useAuth();
  const userId = user?.userId;

  useEffect(() => {
    if (!userId) return;
    // medicationApi.list() syncs as a side effect. Offline, the existing schedule is simply kept.
    const refresh = () => void medicationApi.list().catch(() => {});
    refresh();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => sub.remove();
  }, [userId]);

  // Tapping a reminder (including the one that launched the app) opens the medication list.
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!userId || !response) return;
    const id = response.notification.request.identifier + response.notification.date;
    if (handled.current === id) return;
    handled.current = id;
    router.push('/medications');
  }, [response, userId]);

  return null;
}
