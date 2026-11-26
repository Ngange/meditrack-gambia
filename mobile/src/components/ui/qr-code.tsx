import { create } from 'qrcode/lib/core/qrcode';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * A QR code drawn with plain Views, so it needs no native module (no rebuild of the Android app).
 * Always black on white with a white border, whatever the theme, because scanners need the contrast.
 */
export function QrCode({ value, size = 220, label }: { value: string; size?: number; label: string }) {
  const runs = useMemo(() => {
    const { modules } = create(value, { errorCorrectionLevel: 'M' });
    const n = modules.size;
    const out: { row: number; col: number; len: number }[] = [];
    for (let row = 0; row < n; row++) {
      let start = -1;
      for (let col = 0; col <= n; col++) {
        const dark = col < n && modules.get(row, col) === 1;
        if (dark && start < 0) start = col;
        if (!dark && start >= 0) {
          out.push({ row, col: start, len: col - start });
          start = -1;
        }
      }
    }
    return { n, runs: out };
  }, [value]);

  const quiet = 4; // the white border a scanner needs, in squares
  const cell = Math.floor(size / (runs.n + quiet * 2));
  const total = cell * (runs.n + quiet * 2);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={[styles.box, { width: total, height: total }]}>
      {runs.runs.map((r) => (
        <View key={`${r.row}-${r.col}`} style={[styles.dark, { left: (r.col + quiet) * cell, top: (r.row + quiet) * cell, width: r.len * cell, height: cell }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#ffffff', borderRadius: 8, overflow: 'hidden' },
  dark: { position: 'absolute', backgroundColor: '#111827' },
});
