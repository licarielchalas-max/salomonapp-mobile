import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { subscribeAlerts, type AlertRequest } from '../lib/webAlert';
import { colors, fonts, radius, spacing } from '../theme';

// Avisos y confirmaciones dentro de la app (solo en web; en el teléfono se usan los nativos).
export function AlertHost() {
  const [queue, setQueue] = useState<AlertRequest[]>([]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    return subscribeAlerts((req) => setQueue((q) => [...q, req]));
  }, []);

  const current = queue[0];
  if (Platform.OS !== 'web' || !current) return null;

  const cancelButton = current.buttons.find((b) => b.style === 'cancel');

  function press(index: number) {
    const btn = current.buttons[index];
    setQueue((q) => q.slice(1));
    btn?.onPress?.();
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => cancelButton && press(current.buttons.indexOf(cancelButton))}>
      <View style={styles.overlay}>
        <View style={styles.card} accessibilityRole="alert">
          <Text style={styles.title}>{current.title}</Text>
          {!!current.message && <Text style={styles.message}>{current.message}</Text>}
          <View style={styles.buttons}>
            {current.buttons.map((b, i) => {
              const cancel = b.style === 'cancel';
              const destructive = b.style === 'destructive';
              return (
                <Pressable
                  key={`${b.text}-${i}`}
                  onPress={() => press(i)}
                  accessibilityRole="button"
                  accessibilityLabel={b.text}
                  style={[styles.btn, cancel && styles.btnGhost, destructive && styles.btnDanger, !cancel && !destructive && styles.btnGold]}
                >
                  <Text style={[styles.btnText, cancel && styles.btnTextGhost, destructive && styles.btnTextDanger]}>{b.text ?? 'OK'}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: {
    width: '100%', maxWidth: 420, backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.xl,
    borderWidth: 1, borderColor: colors.goldBorder, gap: spacing.md,
  },
  title: { fontFamily: fonts.heading, fontSize: 19, color: colors.onDark },
  message: { fontSize: 14, color: colors.onDarkMuted, lineHeight: 21 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  btn: { minWidth: 96, paddingHorizontal: spacing.lg, paddingVertical: 12, borderRadius: radius.pill, alignItems: 'center', borderWidth: 1 },
  btnGold: { backgroundColor: colors.gold, borderColor: colors.gold },
  btnGhost: { backgroundColor: 'transparent', borderColor: colors.glassBorder },
  btnDanger: { backgroundColor: 'rgba(255,143,122,0.14)', borderColor: 'rgba(255,143,122,0.55)' },
  btnText: { fontSize: 14, fontWeight: '700', color: colors.onNavy },
  btnTextGhost: { color: colors.onDarkMuted },
  btnTextDanger: { color: colors.rust },
});
