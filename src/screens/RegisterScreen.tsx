import React, { useState } from 'react';
import { TRIAL_DAYS } from '../lib/plans';
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
import { useAuth } from '../context/AuthProvider';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/RootNavigator';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'> };

export function RegisterScreen({ navigation }: Props) {
  const { signUp, resendConfirmation } = useAuth();
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referral, setReferral] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleResend() {
    setResending(true);
    setResendMsg(null);
    const { error: err } = await resendConfirmation(email.trim().toLowerCase());
    setResending(false);
    setResendMsg(err
      ? (/rate limit|too many|seconds/i.test(err) ? 'Se enviaron demasiados correos. Espera unos minutos e inténtalo de nuevo.' : err)
      : 'Listo, te enviamos el correo otra vez. Revisa también la carpeta de spam.');
  }

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Por favor completa todos los campos.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await signUp(email.trim().toLowerCase(), password, name.trim(), referral);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <SafeAreaView style={styles.safe}>
        <LinearGradient colors={[colors.bgDeep, colors.bg, '#041F0F']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.successWrap}>
          <Text style={styles.successIcon}>✉️</Text>
          <Text style={styles.successTitle}>¡Revisa tu correo!</Text>
          <Text style={styles.successSub}>
            Te enviamos un enlace de confirmación a{'\n'}
            <Text style={{ fontWeight: '700' }}>{email}</Text>
          </Text>
          <Pressable onPress={handleResend} disabled={resending} accessibilityRole="button" style={{ paddingVertical: spacing.md }}>
            <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 13 }}>{resending ? 'Enviando…' : '¿No te llegó? Reenviar correo'}</Text>
          </Pressable>
          {resendMsg && <Text style={{ color: colors.onDarkMuted, fontSize: 12.5, textAlign: 'center', marginBottom: spacing.md, lineHeight: 18 }}>{resendMsg}</Text>}
          <Pressable style={styles.btnPrimary} onPress={() => navigation.navigate('Login')}>
            <LinearGradient
              colors={[colors.goldBright, colors.gold, colors.goldDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              <Text style={styles.btnPrimaryText}>Ir a Iniciar Sesión</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
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

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Crear cuenta</Text>
            <Text style={styles.tagline}>Empieza gratis · {TRIAL_DAYS} días Premium</Text>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Nombre completo</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu nombre"
              value={name}
              onChangeText={setName}
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
            />

            <Text style={[styles.label, { marginTop: spacing.md }]}>Email</Text>
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

            <Text style={[styles.label, { marginTop: spacing.md }]}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholderTextColor={colors.muted}
            />

            <Text style={[styles.label, { marginTop: spacing.md }]}>Código de referido (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. SAL-AB12CD"
              value={referral}
              onChangeText={setReferral}
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <Pressable
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <LinearGradient
                colors={[colors.goldBright, colors.gold, colors.goldDark]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                {loading
                  ? <ActivityIndicator color="#1a0a00" />
                  : <Text style={styles.btnPrimaryText}>Crear Cuenta</Text>
                }
              </LinearGradient>
            </Pressable>

            <Text style={styles.terms}>
              Al registrarte aceptas nuestros{' '}
              <Text style={styles.termsLink}>Términos de uso</Text>
              {' '}y{' '}
              <Text style={styles.termsLink}>Política de privacidad</Text>.
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}> Inicia sesión</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, flexGrow: 1 },

  backBtn: { marginBottom: spacing.lg },
  backText: { fontSize: 14, color: colors.gold, fontWeight: '600' },

  header: { marginBottom: spacing.xxl },
  title: { fontSize: 28, fontWeight: '700', fontFamily: fonts.heading, color: colors.gold },
  tagline: { fontSize: 13, color: colors.onDarkMuted, marginTop: 4 },

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

  btnPrimary: {
    borderRadius: radius.md,
    overflow: 'hidden',
    marginTop: spacing.xl,
    ...shadow.gold,
  },
  btnGradient: { paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { fontSize: 16, fontWeight: '700', color: '#1a0a00' },

  terms: { fontSize: 11.5, color: colors.onDarkMuted, textAlign: 'center', marginTop: spacing.md, lineHeight: 16 },
  termsLink: { color: colors.gold, fontWeight: '600' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 'auto', paddingTop: spacing.xl },
  footerText: { fontSize: 13, color: colors.onDarkMuted },
  linkText: { fontSize: 13, color: colors.gold, fontWeight: '700' },

  // Success state
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  successIcon: { fontSize: 56, marginBottom: spacing.lg },
  successTitle: { fontSize: 24, fontWeight: '700', fontFamily: fonts.heading, color: colors.gold, marginBottom: spacing.sm },
  successSub: { fontSize: 14, color: colors.onDarkMuted, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xxl },
});
