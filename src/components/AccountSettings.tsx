import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { TextInput } from './AppTextInput';
import { GoldButton } from './brand/Buttons';
import { Chip } from './budget/ui';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Mi cuenta: cambiar el correo con el que entras y la contraseña.
export function AccountSettings() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'email' | 'password' | null>(null);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [saving, setSaving] = useState(false);

  function close() {
    setMode(null);
    setEmail('');
    setPass('');
    setPass2('');
  }

  async function changeEmail() {
    const next = email.trim().toLowerCase();
    if (!EMAIL_RE.test(next)) return Alert.alert('Correo inválido', 'Escribe un correo válido, por ejemplo nombre@correo.com.');
    if (next === (user?.email ?? '').toLowerCase()) return Alert.alert('Es el mismo correo', 'Escribe un correo distinto al actual.');
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: next });
    setSaving(false);
    if (error) return Alert.alert('No se pudo cambiar el correo', error.message);
    close();
    Alert.alert(
      'Revisa tu correo',
      `Te enviamos un enlace de confirmación a ${next}. Tu correo de acceso cambia cuando lo confirmes. Si tu correo actual también recibe un enlace, confírmalo también.`,
    );
  }

  async function changePassword() {
    if (pass.length < 6) return Alert.alert('Contraseña muy corta', 'La contraseña debe tener al menos 6 caracteres.');
    if (pass !== pass2) return Alert.alert('No coinciden', 'Escribe la misma contraseña en los dos campos.');
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pass });
    setSaving(false);
    if (error) return Alert.alert('No se pudo cambiar la contraseña', error.message);
    close();
    Alert.alert('Contraseña actualizada', 'Ya puedes entrar con tu nueva contraseña.');
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Correo de acceso</Text>
      <Text style={styles.value}>{user?.email ?? '—'}</Text>

      <View style={styles.row}>
        <Chip label="Cambiar correo" icon="send" active={mode === 'email'} onPress={() => (mode === 'email' ? close() : setMode('email'))} />
        <Chip label="Cambiar contraseña" icon="lock" active={mode === 'password'} onPress={() => (mode === 'password' ? close() : setMode('password'))} />
      </View>

      {mode === 'email' && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Nuevo correo"
            placeholderTextColor={colors.onDarkMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Nuevo correo"
          />
          <Text style={styles.hint}>Te enviaremos un enlace para confirmar el cambio.</Text>
          <GoldButton label="Guardar correo" onPress={changeEmail} loading={saving} small />
        </View>
      )}

      {mode === 'password' && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={pass}
            onChangeText={setPass}
            placeholder="Nueva contraseña"
            placeholderTextColor={colors.onDarkMuted}
            secureTextEntry
            autoCapitalize="none"
            accessibilityLabel="Nueva contraseña"
          />
          <TextInput
            style={styles.input}
            value={pass2}
            onChangeText={setPass2}
            placeholder="Repite la contraseña"
            placeholderTextColor={colors.onDarkMuted}
            secureTextEntry
            autoCapitalize="none"
            accessibilityLabel="Repite la contraseña"
          />
          <GoldButton label="Guardar contraseña" onPress={changePassword} loading={saving} small />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  label: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2, textTransform: 'uppercase' },
  value: { fontSize: 15, fontWeight: '700', color: colors.onDark },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  form: { gap: spacing.sm, marginTop: spacing.sm },
  hint: { fontSize: 12, color: colors.onDarkMuted },
  input: {
    backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md, paddingVertical: 13, fontSize: 15, color: colors.onDark,
  },
});
