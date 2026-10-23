import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Medication } from '@/features/medications/types';

import { planReminders } from './plan';

const CHANNEL_ID = 'medication-reminders';
const isWeb = Platform.OS === 'web';

export type ReminderPermission = 'granted' | 'denied' | 'undetermined';

const toPermission = (p: Notifications.NotificationPermissionsStatus): ReminderPermission =>
  p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';

/** Show reminders even while the app is open. Call once at startup. */
export function configureReminders() {
  if (isWeb) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function getReminderPermission(): Promise<ReminderPermission> {
  if (isWeb) return 'granted';
  return toPermission(await Notifications.getPermissionsAsync());
}

/** Shows the system permission prompt (only the first time; afterwards it just reports the answer). */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (isWeb) return 'granted';
  return toPermission(await Notifications.requestPermissionsAsync());
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Medication reminders',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

async function replaceSchedule(medications: Medication[]) {
  if (isWeb) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if ((await getReminderPermission()) !== 'granted') return;
  await ensureChannel();

  for (const r of planReminders(medications)) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body, sound: true, data: { screen: '/medications' } },
      trigger: r.at
        ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL_ID }
        : {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: r.hour,
            minute: r.minute,
            channelId: CHANNEL_ID,
          },
    });
  }
}

// Syncs run one after another, so two quick saves can never interleave their cancel/schedule steps.
let queue: Promise<void> = Promise.resolve();

/** Makes the phone's scheduled reminders match this list of medications. Never throws. */
export function syncReminders(medications: Medication[]) {
  queue = queue.then(() => replaceSchedule(medications)).catch(() => {});
  return queue;
}

/** Removes every scheduled reminder (used on sign-out, so the next person on the phone gets none). */
export function clearReminders() {
  return syncReminders([]);
}
