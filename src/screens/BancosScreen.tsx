import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthProvider';
import { useHouseholdCollection } from '../hooks/useHouseholdCollection';

export function BancosScreen() {
  const { householdId } = useAuth();
  const { rows: cuentas, add, remove } = useHouseholdCollection('bank_accounts', householdId, {
    column: 'created_at',
    ascending: false,
  });

  const [banco, setBanco] = useState('');
  const [numeroCuenta, setNumeroCuenta] = useState('');

  async function handleAgregar() {
    if (!banco.trim()) return;
    await add({ household_id: householdId!, banco: banco.trim(), numero_cuenta: numeroCuenta.trim() || null, provider: 'manual' });
    setBanco('');
    setNumeroCuenta('');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.notice}>
        Registro manual: aquí llevas la lista de tus cuentas para tus reportes y la conciliación. Todavía no hay sincronización automática con
        bancos — eso requiere integrar un agregador financiero autorizado más adelante.
      </Text>

      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Nombre del banco o tarjeta" value={banco} onChangeText={setBanco} />
        <TextInput style={styles.input} placeholder="Nº de cuenta (opcional)" value={numeroCuenta} onChangeText={setNumeroCuenta} />
        <Pressable style={styles.submitBtn} onPress={handleAgregar}>
          <Text style={styles.submitBtnText}>+ Agregar cuenta</Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={{ padding: 16, gap: 10 }}
        data={cuentas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowBanco}>{item.banco}</Text>
              {item.numero_cuenta ? <Text style={styles.rowMeta}>{item.numero_cuenta}</Text> : null}
            </View>
            <Pressable onPress={() => remove(item.id)}>
              <Text style={{ color: '#6E6E68' }}>✕</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Sin cuentas registradas.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF8EE' },
  notice: { fontSize: 12, color: '#6E6E68', padding: 16, paddingBottom: 0 },
  form: { padding: 16, gap: 10, backgroundColor: '#fff', margin: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E1DCC8' },
  input: { borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 9, padding: 10, fontSize: 14, backgroundColor: '#FCFBF8' },
  submitBtn: { backgroundColor: '#0F5132', borderRadius: 10, padding: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 10, padding: 12 },
  rowBanco: { fontWeight: '600', fontSize: 13.5 },
  rowMeta: { fontSize: 11.5, color: '#6E6E68', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#6E6E68', marginTop: 20 },
});
