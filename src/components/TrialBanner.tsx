import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { colors, spacing, radius } from '../theme';
import { useAccount } from '../context/AccountProvider';
import { navigationRef } from '../navigation/navigationRef';

// Aviso de prueba gratis: solo aparece mientras la prueba está vigente y no hay plan pagado.
export function TrialBanner() {
  const { access } = useAccount();
  if (!access.isTrial || access.daysLeft === null) return null;

  const urgent = access.daysLeft <= 5;
  return (
    <Pressable
      style={[styles.banner, urgent && styles.bannerUrgent]}
      onPress={() => navigationRef.current?.navigate('Planes')}
      accessibilityRole="button"
    >
      <Text style={[styles.text, urgent && styles.textUrgent]}>
        🎁 Prueba gratis: te quedan {access.daysLeft} día{access.daysLeft === 1 ? '' : 's'}
      </Text>
      <Text style={[styles.cta, urgent && styles.textUrgent]}>Elegir plan ›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.greenSoft,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  bannerUrgent: { backgroundColor: colors.rustSoft, borderColor: colors.rustBorder },
  text: { fontSize: 12, fontWeight: '600', color: colors.green, flex: 1 },
  textUrgent: { color: colors.rust },
  cta: { fontSize: 12, fontWeight: '800', color: colors.green },
});
