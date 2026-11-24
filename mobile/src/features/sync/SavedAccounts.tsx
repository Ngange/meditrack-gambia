import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DangerLink } from '@/components/ui/danger-link';
import { Spacing } from '@/constants/theme';
import { session } from '@/offline/appSession';
import type { Account } from '@/offline/session';
import { confirmDestructive } from '@/utils/confirm';

/** The accounts kept on this phone, with a way to remove one (and its saved records). Shown on the login screen. */
export function SavedAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const refresh = useCallback(() => void session.accounts().then(setAccounts).catch(() => setAccounts([])), []);
  useEffect(refresh, [refresh]);

  if (accounts.length === 0) return null;

  return (
    <ThemedView style={styles.box}>
      <ThemedText type="smallBold">Saved on this phone</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        You can log in to these without internet.
      </ThemedText>
      {accounts.map((a) => (
        <ThemedView key={a.id} style={styles.row}>
          <ThemedText type="small" style={styles.email}>
            {a.email}
          </ThemedText>
          <DangerLink
            label="Remove"
            busyLabel="Removing…"
            busy={false}
            onPress={() =>
              confirmDestructive(
                'Remove this account from the phone?',
                `${a.email}'s saved records are deleted from this phone. Anything not yet sent to the server is lost. The records on the server are not touched.`,
                () => void session.clearAccount(a.id).then(refresh),
                'Remove',
              )
            }
          />
        </ThemedView>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  box: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  email: { flex: 1 },
});
