import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { doctorApi, secretFromScan } from '@/doctor/api';
import { replaceDoctor } from '@/doctor/nav';

export function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [message, setMessage] = useState('Hold the patient’s QR code inside the square.');
  const [busy, setBusy] = useState(false);
  const handling = useRef(false);

  async function onScanned({ data }: { data: string }) {
    if (handling.current) return;
    handling.current = true;
    setBusy(true);
    const secret = secretFromScan(data);
    if (!secret) {
      // Some other QR code: say so, and let the doctor try again after a moment.
      setMessage('That is not a MediTrack patient QR code.');
      setBusy(false);
      setTimeout(() => (handling.current = false), 1500);
      return;
    }
    try {
      const s = await doctorApi.openByQr(secret);
      replaceDoctor('/doctor/patient', { sid: s.session_id });
    } catch (err) {
      setMessage(errorMessage(err));
      setBusy(false);
      setTimeout(() => (handling.current = false), 2500);
    }
  }

  if (!permission) return <ThemedView style={styles.flex} />;

  if (!permission.granted) {
    return (
      <ThemedView style={[styles.flex, styles.pad]}>
        <BackLink label="Back" onPress={() => router.back()} />
        <ThemedText type="title">Camera needed</ThemedText>
        <ThemedText themeColor="textSecondary">Allow the camera so you can scan a patient&apos;s QR code.</ThemedText>
        <Button title="Allow camera" onPress={requestPermission} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={busy ? undefined : onScanned}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.top}>
          <Button title="Back" variant="secondary" onPress={() => router.back()} />
        </View>
        <View style={styles.frame} />
        <View style={styles.bottom}>
          <ThemedText style={styles.msg}>{busy ? 'Opening…' : message}</ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: Spacing.four, gap: Spacing.three, justifyContent: 'center' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', alignItems: 'center', padding: Spacing.four },
  top: { alignSelf: 'stretch' },
  frame: { width: 240, height: 240, borderWidth: 3, borderColor: '#fff', borderRadius: 16 },
  bottom: { backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 12, padding: Spacing.three },
  msg: { color: '#fff', textAlign: 'center' },
});
