import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { errorMessage } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QrCode } from '@/components/ui/qr-code';
import { Spacing } from '@/constants/theme';
import { activeStore } from '@/offline/active';
import { confirmDestructive } from '@/utils/confirm';

import { shareApi } from './api';
import { sendLink } from './sendLink';

const META_KEY = 'standing_qr_url';

const readSaved = async () => {
  try {
    return await activeStore().getMeta(META_KEY);
  } catch {
    return null;
  }
};
const save = (url: string) => activeStore().setMeta(META_KEY, url).catch(() => undefined);

/**
 * "My QR code": always on this screen. The address is kept on the phone, so the code still shows with no
 * connection (a doctor can scan it in a clinic with no signal; only the doctor's phone needs to be online).
 */
export function StandingQrCard() {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setNote('');
    const saved = await readSaved();
    if (saved) {
      setUrl(saved);
      setLoading(false);
    }
    try {
      const fresh = await shareApi.standing();
      setUrl(fresh.url);
      void save(fresh.url);
    } catch (err) {
      if (!saved) setNote(`${errorMessage(err)} Your QR code will appear once you are online.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function reset() {
    confirmDestructive(
      'Reset your QR code?',
      'The old one stops working at once, including any copy you printed or sent. You will need to print the new one.',
      async () => {
        setBusy(true);
        setNote('');
        try {
          const fresh = await shareApi.resetStanding();
          setUrl(fresh.url);
          void save(fresh.url);
          setNote('Done. Your old QR code no longer works.');
        } catch (err) {
          setNote(errorMessage(err));
        } finally {
          setBusy(false);
        }
      },
      'Reset',
    );
  }

  async function send() {
    if (!url) return;
    try {
      setNote((await sendLink(url)) === 'copied' ? 'Link copied.' : '');
    } catch {
      setNote('Could not send the link. Try again.');
    }
  }

  return (
    <Card accessibilityLabel="My QR code">
      <ThemedText type="smallBold">My QR code</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        One code for your whole record. A doctor with a MediTrack account who scans it can add to your record. Anyone else sees a read-only page.
      </ThemedText>
      {loading && !url ? (
        <ActivityIndicator />
      ) : url ? (
        <>
          <ThemedView style={styles.qr}>
            <QrCode value={url} size={240} label="Your permanent QR code" />
          </ThemedView>
          <Button title="Send link" variant="secondary" onPress={send} />
          <Button title="Reset QR code" variant="secondary" onPress={reset} loading={busy} />
        </>
      ) : null}
      {note ? (
        <ThemedText type="small" themeColor="textSecondary">
          {note}
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  qr: { alignItems: 'center', paddingVertical: Spacing.two },
});
