import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthProvider';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || password.length < 8) {
      setError('Correo requerido y contraseña de al menos 8 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: signUpError } = await signUp(email.trim(), password, displayName.trim());
    setLoading(false);
    if (signUpError) {
      setError(signUpError);
      return;
    }
    setInfo('Cuenta creada. Si tu proyecto requiere confirmación por correo, revisa tu bandeja antes de iniciar sesión.');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crea tu cuenta</Text>

      <TextInput style={styles.input} placeholder="Tu nombre" value={displayName} onChangeText={setDisplayName} />
      <TextInput
        style={styles.input}
        placeholder="tucorreo@ejemplo.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña (mínimo 8 caracteres)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {info ? <Text style={styles.info}>{info}</Text> : null}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Crear cuenta</Text>}
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>¿Ya tienes cuenta? Inicia sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF8EE', padding: 24, justifyContent: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#0F5132', textAlign: 'center', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 10, padding: 12, fontSize: 14, backgroundColor: '#FCFBF8' },
  button: { backgroundColor: '#0F5132', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  error: { color: '#8C4A3B', fontSize: 12.5 },
  info: { color: '#0F5132', fontSize: 12.5 },
  link: { color: '#0F5132', fontWeight: '600', fontSize: 12.5, textAlign: 'center', marginTop: 14, textDecorationLine: 'underline' },
});
