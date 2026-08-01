import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthProvider';
import { useHouseholdSettings } from '../hooks/useHouseholdSettings';
import { isAppLockEnabled, isBiometricAvailable, setAppLockEnabled } from '../lib/appLock';

export function SettingsScreen() {
  const { signOut } = useAuth();
  const { nombreUsuario, moneda, monthlyBudgetTotal, updateMonthlyBudget, updatePreferences } = useHouseholdSettings();
  const [nombre, setNombre] = useState(nombreUsuario);
  const [presupuesto, setPresupuesto] = useState(String(monthlyBudgetTotal || ''));
  const [lockEnabled, setLockEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => setNombre(nombreUsuario), [nombreUsuario]);
  useEffect(() => setPresupuesto(monthlyBudgetTotal ? String(monthlyBudgetTotal) : ''), [monthlyBudgetTotal]);
  useEffect(() => {
    isAppLockEnabled().then(setLockEnabled);
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text style={styles.title}>Preferencias</Text>

      <View>
        <Text style={styles.label}>Tu nombre</Text>
        <TextInput
          style={styles.input}
          value={nombre}
          onChangeText={setNombre}
          onBlur={() => updatePreferences({ nombreUsuario: nombre })}
        />
      </View>

      <View>
        <Text style={styles.label}>Moneda</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={moneda} onValueChange={(v) => updatePreferences({ moneda: v })}>
            <Picker.Item label="Peso dominicano (RD$)" value="RD$" />
            <Picker.Item label="Dólar estadounidense ($)" value="$" />
            <Picker.Item label="Euro (€)" value="€" />
          </Picker>
        </View>
      </View>

      <View>
        <Text style={styles.label}>Presupuesto mensual total</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={presupuesto}
          onChangeText={setPresupuesto}
          onBlur={() => updateMonthlyBudget(Number(presupuesto) || 0)}
        />
      </View>

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Bloqueo con huella/rostro</Text>
          <Text style={styles.hint}>{biometricAvailable ? 'Disponible en este dispositivo.' : 'Este dispositivo no tiene biometría configurada.'}</Text>
        </View>
        <Switch
          value={lockEnabled}
          disabled={!biometricAvailable}
          onValueChange={async (value) => {
            setLockEnabled(value);
            await setAppLockEnabled(value);
          }}
        />
      </View>

      <Pressable style={styles.signOutBtn} onPress={signOut}>
        <Text style={styles.signOutText}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF8EE' },
  title: { fontSize: 22, fontWeight: '700', color: '#0F5132', marginBottom: 4 },
  label: { fontSize: 12.5, fontWeight: '600', color: '#6E6E68', marginBottom: 5 },
  hint: { fontSize: 11.5, color: '#6E6E68' },
  input: { borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 9, padding: 10, fontSize: 14, backgroundColor: '#fff' },
  pickerWrap: { borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 9, backgroundColor: '#fff' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  signOutBtn: { borderWidth: 1, borderColor: '#E3C9C0', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
  signOutText: { color: '#8C4A3B', fontWeight: '600' },
});
