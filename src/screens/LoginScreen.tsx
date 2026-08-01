import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthProvider';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    const { error: signInError } = await signIn(email.trim(), password);
    setLoading(false);
    if (signInError) setError(signInError);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Salomon</Text>
      <Text style={styles.subtitle}>Con sabiduría, comienza a construir tu futuro.</Text>

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
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Iniciar sesión</Text>}
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>¿No tienes cuenta? Regístrate</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF8EE', padding: 24, justifyContent: 'center', gap: 12 },
  title: { fontSize: 28, fontWeight: '700', color: '#0F5132', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#6E6E68', textAlign: 'center', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 10, padding: 12, fontSize: 14, backgroundColor: '#FCFBF8' },
  button: { backgroundColor: '#0F5132', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  error: { color: '#8C4A3B', fontSize: 12.5 },
  link: { color: '#0F5132', fontWeight: '600', fontSize: 12.5, textAlign: 'center', marginTop: 14, textDecorationLine: 'underline' },
});
