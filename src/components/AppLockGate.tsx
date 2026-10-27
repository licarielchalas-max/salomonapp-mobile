import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { isAppLockEnabled, unlockWithBiometrics } from '../lib/appLock';
import { colors, fonts, radius, spacing } from '../theme';
import { SalomonEmblem } from './brand/SalomonEmblem';

const FOIL = ['#FBEBB0', '#EBC95E', '#D8AE3C', '#B88A25'] as const;

export function AppLockGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [intentos, setIntentos] = useState(0);

  async function attemptUnlock() {
    const enabled = await isAppLockEnabled();
    if (!enabled) {
      setUnlocked(true);
      setChecking(false);
      return;
    }
    setChecking(false);
    const ok = await unlockWithBiometrics();
    setUnlocked(ok);
    if (!ok) setIntentos((n) => n + 1);
  }

  useEffect(() => {
    attemptUnlock();
  }, []);

  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (!unlocked) {
    return (
      <View style={styles.center}>
        <SalomonEmblem size={150} />
        <Text style={styles.title}>Salomón está bloqueado</Text>
        <Text style={styles.subtitle}>
          Usa tu huella o rostro para entrar. Tus finanzas quedan protegidas aunque alguien tome tu teléfono.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.buttonWrap, pressed && { opacity: 0.88 }]}
          onPress={attemptUnlock}
          accessibilityRole="button"
        >
          <LinearGradient colors={FOIL} locations={[0, 0.44, 0.54, 1]} style={styles.button}>
            <Text style={styles.buttonText}>{intentos === 0 ? 'Desbloquear' : 'Intentar de nuevo'}</Text>
          </LinearGradient>
        </Pressable>

        {intentos > 1 ? (
          <Text style={styles.hint}>Si la biometría no responde, desbloquea el teléfono y vuelve a abrir la app.</Text>
        ) : null}

        <Text style={styles.verse}>“Los planes del diligente ciertamente tienden a la abundancia.”</Text>
        <Text style={styles.verseRef}>PROVERBIOS 21:5</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xxl,
  },
  title: { fontFamily: fonts.heading, fontSize: 24, color: colors.gold, textAlign: 'center', marginTop: spacing.lg },
  subtitle: {
    fontSize: 14,
    color: colors.onDarkMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    maxWidth: 320,
  },
  buttonWrap: { width: '100%', maxWidth: 320 },
  button: { height: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '800', color: colors.onNavy },
  hint: { marginTop: spacing.md, fontSize: 12, color: colors.onDarkMuted, textAlign: 'center', maxWidth: 300 },
  verse: {
    marginTop: spacing.xxl,
    fontFamily: fonts.headingRegular,
    fontStyle: 'italic',
    fontSize: 15,
    color: colors.onDark,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  verseRef: { marginTop: spacing.sm, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: colors.goldBright },
});
