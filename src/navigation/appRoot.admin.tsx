import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/AppText';
import { TextInput } from '../components/AppTextInput';
import { SalomonEmblem } from '../components/brand/SalomonEmblem';
import { AdminScreen } from '../screens/AdminScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { useAuth } from '../context/AuthProvider';
import { useAccount } from '../context/AccountProvider';
import { colors, fonts, radius, spacing } from '../theme';

// Raíz de la app de administración (solo web, su propio dominio). Es lo único que se compila en ese paquete:
// inicio de sesión + panel. No hay registro, ni menú, ni pantallas de usuario.

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={[colors.bgDeep, colors.bg, '#041F0F']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      {children}
    </SafeAreaView>
  );
}

function AdminLogin() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || !password) { setError('Escribe tu correo y contraseña.'); return; }
    setBusy(true);
    setError(null);
    const { error: err } = await signIn(email.trim().toLowerCase(), password);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <Shell>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
          <View style={styles.loginCard}>
            <SalomonEmblem size={92} />
            <Text style={styles.title}>Salomón · Administración</Text>
            <Text style={styles.sub}>Acceso solo para el equipo.</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Correo"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              accessibilityLabel="Correo"
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña"
              placeholderTextColor={colors.muted}
              secureTextEntry
              autoComplete="current-password"
              onSubmitEditing={submit}
              accessibilityLabel="Contraseña"
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable style={styles.btn} onPress={submit} disabled={busy} accessibilityRole="button">
              {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.btnText}>Entrar</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Shell>
  );
}

function Denied() {
  const { user, signOut } = useAuth();
  return (
    <Shell>
      <View style={styles.center}>
        <View style={styles.loginCard}>
          <Text style={styles.title}>Acceso restringido</Text>
          <Text style={styles.sub}>{user?.email} no tiene permisos de administración.</Text>
          <Pressable style={styles.btn} onPress={signOut} accessibilityRole="button">
            <Text style={styles.btnText}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </View>
    </Shell>
  );
}

export function AppRoot() {
  const { loading, session, signOut, recovering } = useAuth();
  const { loading: accountLoading, isAdmin } = useAccount();

  if (loading || (session && accountLoading)) {
    return (
      <Shell>
        <View style={styles.center}><ActivityIndicator color={colors.gold} size="large" /></View>
      </Shell>
    );
  }
  if (recovering) return <ResetPasswordScreen />;
  if (!session) return <AdminLogin />;
  if (!isAdmin) return <Denied />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Salomón · Administración</Text>
        <Pressable onPress={signOut} accessibilityRole="button" accessibilityLabel="Cerrar sesión">
          <Text style={styles.topOut}>Cerrar sesión</Text>
        </Pressable>
      </View>
      <View style={styles.panel}>
        <AdminScreen />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flexGrow: 1, flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  loginCard: { width: '100%', maxWidth: 400, alignItems: 'center', gap: spacing.md },
  title: { fontFamily: fonts.heading, fontSize: 24, color: colors.gold, textAlign: 'center' },
  sub: { fontSize: 13, color: colors.onDarkMuted, textAlign: 'center', marginBottom: spacing.sm },
  input: {
    width: '100%', paddingVertical: 13, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.glassBorder, backgroundColor: colors.bgCard, color: colors.onDark, fontSize: 15,
  },
  error: { color: colors.rust, fontSize: 13, textAlign: 'center' },
  btn: { width: '100%', alignItems: 'center', paddingVertical: 14, borderRadius: radius.md, backgroundColor: colors.gold, marginTop: spacing.sm },
  btnText: { color: colors.bg, fontWeight: '800', fontSize: 15 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.glassBorder, backgroundColor: colors.bgDeep,
  },
  topTitle: { fontFamily: fonts.heading, fontSize: 17, color: colors.gold },
  topOut: { fontSize: 13, fontWeight: '700', color: colors.onDarkMuted },
  // El panel en pantallas anchas queda centrado y legible
  panel: { flex: 1, width: '100%', maxWidth: 980, alignSelf: 'center' },
});
