import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PressableCard } from '@/components/ui/pressable-card';
import { useSync } from '@/context/SyncContext';

import { ago } from './describe';

/** One line saying whether the phone and the server agree, and what needs the patient. Tapping opens Sync & offline. */
export function SyncStatusCard() {
  const { state, counts, syncEnabled } = useSync();
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  let title: string;
  let detail: string | null = null;
  let attention = false;
  let target: '/sync' | '/conflicts' | '/rejected' = '/sync';

  if (!syncEnabled) {
    title = 'Working offline';
    detail = counts.waiting > 0 ? `Online sync is off. ${plural(counts.waiting, 'change is', 'changes are')} waiting.` : 'Online sync is off. Your records are on this phone only.';
  } else if (counts.conflicts > 0) {
    title = `${plural(counts.conflicts, 'record needs', 'records need')} your decision`;
    detail = 'It was changed here and somewhere else. Tap to choose.';
    attention = true;
    target = '/conflicts';
  } else if (state.needsSignIn) {
    title = 'Sign in to sync';
    detail = `Your records are safe on this phone${counts.waiting > 0 ? ` and ${plural(counts.waiting, 'change is', 'changes are')} waiting` : ''}. Tap to sign in again.`;
    attention = true;
  } else if (counts.rejected > 0) {
    title = `${plural(counts.rejected, 'change', 'changes')} could not be saved`;
    detail = 'The server did not accept them. Tap to see why.';
    attention = true;
    target = '/rejected';
  } else if (state.running) {
    title = 'Syncing…';
  } else if (state.problem === 'offline') {
    title = 'Offline';
    detail = counts.waiting > 0 ? `${plural(counts.waiting, 'change', 'changes')} will be sent when you are connected.` : 'Everything you see is saved on this phone.';
  } else if (state.problem === 'server') {
    title = 'Could not sync';
    detail = state.message ?? 'Will try again.';
  } else if (counts.waiting > 0) {
    title = `${plural(counts.waiting, 'change', 'changes')} waiting to sync`;
  } else {
    title = 'Up to date';
    detail = `Last synced ${ago(state.lastAt ?? counts.lastSync)}`;
  }

  return (
    <PressableCard label={`${title}. ${detail ?? ''} Open sync settings.`} onPress={() => router.push(target)}>
      <ThemedText type="smallBold" themeColor={attention ? 'error' : undefined} style={styles.title}>
        {title}
      </ThemedText>
      {detail ? (
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      ) : null}
    </PressableCard>
  );
}

const styles = StyleSheet.create({ title: { fontWeight: 600 } });
