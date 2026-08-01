import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { isAppLockEnabled, unlockWithBiometrics } from '../lib/appLock';

export function AppLockGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);

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
  }

  useEffect(() => {
    attemptUnlock();
  }, []);

  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0F5132" />
      </View>
    );
  }

  if (!unlocked) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Salomon está bloqueado</Text>
        <Text style={styles.subtitle}>Usa tu huella o rostro para continuar.</Text>
        <Button title="Intentar de nuevo" onPress={attemptUnlock} color="#0F5132" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FBF8EE', padding: 24 },
  title: { fontSize: 18, fontWeight: '700', color: '#0F5132' },
  subtitle: { fontSize: 13, color: '#6E6E68', textAlign: 'center', marginBottom: 8 },
});
