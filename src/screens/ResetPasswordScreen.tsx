import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/AppText';
import { TextInput } from '../components/AppTextInput';
import { SalomonEmblem } from '../components/brand/SalomonEmblem';
import { useAuth } from '../context/AuthProvider';
import { colors, fonts, radius, spacing } from '../theme';

// Se muestra cuando la persona abre el enlace de "recuperar contraseña" que le llegó por correo.
export function ResetPasswordScreen() {
  const { updatePassword, cancelRecovery } = useAuth();
  const [pass, setPass] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (pass.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (pass !== again) { setError('Las contraseñas no coinciden.'); return; }
    setBusy(true);
    setError(null);
    const { error: err } = await updatePassword(pass);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={[colors.bgDeep, colors.bg, '#041F0F']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <SalomonEmblem size={88} />
            <Text style={styles.title}>Crea tu nueva contraseña</Text>
            <Text style={styles.sub}>Elige una contraseña nueva para entrar a tu cuenta.</Text>

            {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

            <Text style={styles.label}>Nueva contraseña</Text>
            <View style={styles.passRow}>
              <TextInput
                style={styles.passInput}
                value={pass}
                onChangeText={setPass}
                secureTextEntry={!show}
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                autoComplete="new-password"
                accessibilityLabel="Nueva contraseña"
              />
              <Pressable onPress={() => setShow((v) => !v)} style={styles.showBtn} accessibilityRole="button" accessibilityLabel={show ? 'Ocultar contraseña' : 'Ver contraseña'}>
                <Text style={styles.showText}>{show ? 'Ocultar' : 'Ver'}</Text>
              </Pressable>
            </View>

            <Text style={[styles.label, { marginTop: spacing.md }]}>Confirmar contraseña</Text>
            <TextInput
              style={styles.input}
              value={again}
              onChangeText={setAgain}
              secureTextEntry={!show}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              autoComplete="new-password"
              onSubmitEditing={save}
              accessibilityLabel="Confirmar contraseña"
            />

            <Pressable style={[styles.btn, busy && { opacity: 0.6 }]} onPress={save} disabled={busy} accessibilityRole="button">
              {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.btnText}>Guardar contraseña</Text>}
            </Pressable>
            <Pressable onPress={cancelRecovery} style={styles.cancel} accessibilityRole="button">
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: { width: '100%', maxWidth: 420, alignItems: 'stretch', gap: 4 },
  title: { fontFamily: fonts.heading, fontSize: 24, color: colors.gold, textAlign: 'center', marginTop: spacing.md },
  sub: { fontSize: 13, color: colors.onDarkMuted, textAlign: 'center', marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '700', color: colors.onDark, marginBottom: 6 },
  input: {
    paddingVertical: 13, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.glassBorder, backgroundColor: colors.bgCard, color: colors.onDark, fontSize: 15,
  },
  passRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.glassBorder, backgroundColor: colors.bgCard,
  },
  passInput: { flex: 1, paddingVertical: 13, paddingHorizontal: spacing.md, color: colors.onDark, fontSize: 15 },
  showBtn: { paddingHorizontal: spacing.md, paddingVertical: 12 },
  showText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
  errorBox: { backgroundColor: colors.rustSoft, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.rustBorder, marginBottom: spacing.md },
  errorText: { color: colors.rust, fontSize: 13 },
  btn: { alignItems: 'center', paddingVertical: 14, borderRadius: radius.md, backgroundColor: colors.gold, marginTop: spacing.lg },
  btnText: { color: colors.bg, fontWeight: '800', fontSize: 15 },
  cancel: { alignItems: 'center', paddingVertical: spacing.md },
  cancelText: { color: colors.onDarkMuted, fontSize: 13, fontWeight: '700' },
});
