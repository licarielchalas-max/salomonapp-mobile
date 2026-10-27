import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { TextInput } from '../components/AppTextInput';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, fonts, shadow } from '../theme';
import { SalomonEmblem } from '../components/brand/SalomonEmblem';
import { useAuth } from '../context/AuthProvider';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/RootNavigator';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'> };

export function LoginScreen({ navigation }: Props) {
  const { signIn, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [info, setInfo] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Por favor completa todos los campos.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (err) setError(err);
  }

  async function handleReset() {
    if (!email.trim()) {
      setError('Escribe tu correo.');
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    const { error: err } = await requestPasswordReset(email.trim().toLowerCase());
    setLoading(false);
    if (err) {
      setError(/rate limit|too many|seconds/i.test(err) ? 'Se enviaron demasiados correos. Espera unos minutos e inténtalo de nuevo.' : err);
    } else {
      setInfo('Si el correo está registrado, te enviamos un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.');
    }
  }

  function switchMode(next: 'login' | 'reset') {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={[colors.bgDeep, colors.bg, '#041F0F']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Volver</Text>
          </Pressable>

          {/* Logo */}
          <View style={styles.header}>
            <SalomonEmblem size={118} />
            <Text style={styles.appName}>SALOMÓN</Text>
            <Text style={styles.tagline}>{mode === 'reset' ? 'Recuperar contraseña' : 'Bienvenido de vuelta'}</Text>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {info && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>{info}</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@email.com"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />

            {mode === 'login' && (
              <>
            <Text style={[styles.label, { marginTop: spacing.md }]}>Contraseña</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                placeholderTextColor={colors.muted}
              />
              <Pressable onPress={() => setShowPassword(v => !v)} style={styles.showBtn}>
                <Text style={styles.showText}>{showPassword ? 'Ocultar' : 'Ver'}</Text>
              </Pressable>
            </View>

              </>
            )}

            {mode === 'reset' && (
              <Text style={styles.resetHint}>Escribe tu correo y te enviamos un enlace para crear una contraseña nueva.</Text>
            )}
            <Pressable style={styles.forgotBtn} onPress={() => switchMode(mode === 'login' ? 'reset' : 'login')} accessibilityRole="button">
              <Text style={styles.forgotText}>{mode === 'login' ? '¿Olvidaste tu contraseña?' : 'Volver a iniciar sesión'}</Text>
            </Pressable>

            <Pressable
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={mode === 'login' ? handleLogin : handleReset}
              disabled={loading}
              accessibilityRole="button"
            >
              <LinearGradient
                colors={[colors.goldBright, colors.gold, colors.goldDark]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                {loading
                  ? <ActivityIndicator color="#1a0a00" />
                  : <Text style={styles.btnPrimaryText}>{mode === 'login' ? 'Iniciar Sesión' : 'Enviar enlace'}</Text>
                }
              </LinearGradient>
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>¿No tienes cuenta?</Text>
            <Pressable onPress={() => navigation.navigate('Register')}>
              <Text style={styles.linkText}> Regístrate aquí</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  infoBox: { backgroundColor: colors.greenSoft, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.greenBorder, marginBottom: spacing.md },
  infoText: { color: colors.green, fontSize: 13, lineHeight: 19 },
  resetHint: { color: colors.onDarkMuted, fontSize: 12.5, lineHeight: 18, marginTop: spacing.sm },
  content: { padding: spacing.xl, flexGrow: 1 },

  backBtn: { marginBottom: spacing.lg },
  backText: { fontSize: 14, color: colors.gold, fontWeight: '600' },

  header: { alignItems: 'center', marginBottom: spacing.xxl, width: '100%' },
  logoImg: { width: 200, height: 113, marginBottom: spacing.sm, alignSelf: 'center' },
  appName: { fontSize: 32, fontWeight: '700', fontFamily: fonts.heading, color: colors.gold },
  tagline: { fontSize: 14, color: colors.onDarkMuted, marginTop: 4 },

  errorBox: {
    backgroundColor: colors.rustSoft,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.rust,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { fontSize: 13, color: colors.rust, lineHeight: 18 },

  form: { marginBottom: spacing.xl },
  label: { fontSize: 13, fontWeight: '600', color: colors.onDark, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: colors.glassBorder,
    borderRadius: radius.md,
    paddingVertical: 14, paddingHorizontal: spacing.md,
    fontSize: 15, backgroundColor: colors.bgCard, color: colors.onDark,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.glassBorder,
    borderRadius: radius.md, backgroundColor: colors.bgCard,
  },
  passwordInput: {
    flex: 1, paddingVertical: 14, paddingHorizontal: spacing.md,
    fontSize: 15, color: colors.onDark,
  },
  showBtn: { paddingHorizontal: spacing.md },
  showText: { fontSize: 12, color: colors.gold, fontWeight: '600' },
  forgotBtn: { alignSelf: 'flex-end', marginTop: spacing.sm, marginBottom: spacing.lg },
  forgotText: { fontSize: 12, color: colors.gold, fontWeight: '500' },

  btnPrimary: {
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadow.gold,
  },
  btnGradient: { paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { fontSize: 16, fontWeight: '700', color: '#1a0a00' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 'auto', paddingTop: spacing.xl },
  footerText: { fontSize: 13, color: colors.onDarkMuted },
  linkText: { fontSize: 13, color: colors.gold, fontWeight: '700' },
});
