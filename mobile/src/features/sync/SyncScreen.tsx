import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch } from 'react-native';

import { errorMessage } from '@/api';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { PressableCard } from '@/components/ui/pressable-card';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { useTheme } from '@/hooks/use-theme';
import { session } from '@/offline/appSession';
import { confirmDestructive } from '@/utils/confirm';

import { ago } from './describe';
import { SyncStatusCard } from './SyncStatusCard';

export function SyncScreen() {
  const theme = useTheme();
  const { user, signOut, openedOffline } = useAuth();
  const { state, counts, syncEnabled, setSyncEnabled, syncNow, reauth } = useSync();
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');

  function toggle(on: boolean) {
    if (on) return void setSyncEnabled(true);
    confirmDestructive(
      'Switch off online sync?',
      `Your records stay on this phone and everything keeps working without internet. Nothing is sent to the server, and changes made elsewhere (the web, your doctor) will not arrive until you switch it back on. Sharing and documents need sync on.${counts.waiting > 0 ? `\n\n${counts.waiting} change${counts.waiting === 1 ? ' is' : 's are'} still waiting to be sent.` : ''}`,
      () => void setSyncEnabled(false),
      'Switch off',
    );
  }

  async function signInAgain() {
    setSignInError('');
    setSigningIn(true);
    try {
      await reauth(password);
      setPassword('');
    } catch (err) {
      setSignInError(errorMessage(err));
    } finally {
      setSigningIn(false);
    }
  }

  function clearData() {
    const account = session.current;
    if (!account) return;
    const unsent = counts.waiting + counts.conflicts;
    confirmDestructive(
      'Remove your data from this phone?',
      `This deletes the saved copy of ${account.email}'s records from this phone and signs you out. Your records on the server are not touched; sign in with internet to download them again.${
        unsent > 0 ? `\n\n${unsent} change${unsent === 1 ? ' has' : 's have'} not reached the server and will be lost.` : ''
      }${!syncEnabled ? '\n\nOnline sync is off, so anything you added since may be only on this phone.' : ''}`,
      () => {
        void (async () => {
          await session.clearAccount(account.id);
          await signOut();
        })();
      },
      'Remove data',
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Sync & offline" onBack={() => router.back()} />

        <SyncStatusCard />

        <Card style={styles.row}>
          <ThemedView style={styles.switchText}>
            <ThemedText type="smallBold">Sync with server</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {syncEnabled
                ? 'On. Changes are sent and received whenever you have a connection.'
                : 'Off. The app works only on this phone and makes no internet calls.'}
            </ThemedText>
          </ThemedView>
          <Switch
            value={syncEnabled}
            onValueChange={toggle}
            accessibilityLabel="Sync with server"
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={syncEnabled ? theme.onPrimary : theme.textSecondary}
          />
        </Card>

        {syncEnabled && state.needsSignIn ? (
          <Card style={styles.signIn}>
            <ThemedText type="smallBold">Sign in again to sync</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              This phone has not been in touch with the server for a long time, or was signed out from another device. Your records and waiting changes are safe.
            </ThemedText>
            <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} autoComplete="password" placeholder="Enter your password" />
            <FormError message={signInError} />
            <Button title="Sign in and sync" onPress={() => void signInAgain()} loading={signingIn} disabled={!password} />
          </Card>
        ) : null}

        <Button title={state.running ? 'Syncing…' : 'Sync now'} variant="secondary" disabled={!syncEnabled || state.running || state.needsSignIn} onPress={() => void syncNow()} />

        {counts.conflicts > 0 ? (
          <PressableCard label="Records that need your decision" onPress={() => router.push('/conflicts')}>
            <ThemedText type="smallBold">Needs your decision ({counts.conflicts})</ThemedText>
          </PressableCard>
        ) : null}
        {counts.rejected > 0 ? (
          <PressableCard label="Changes that could not be saved" onPress={() => router.push('/rejected')}>
            <ThemedText type="smallBold">Changes not saved ({counts.rejected})</ThemedText>
          </PressableCard>
        ) : null}

        <ThemedText type="small" themeColor="textSecondary">
          Signed in as {user?.email}
          {openedOffline ? ' (opened without a connection)' : ''}. Last synced {ago(state.lastAt ?? counts.lastSync)}. Signing out keeps your data on this phone, encrypted, so you can open it again without internet.
        </ThemedText>

        <Button title="Remove my data from this phone" variant="destructive" onPress={clearData} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  switchText: { flex: 1, gap: Spacing.one, backgroundColor: 'transparent' },
  signIn: { gap: Spacing.two },
});
