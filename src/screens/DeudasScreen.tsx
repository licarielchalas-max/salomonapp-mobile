import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthProvider';
import { useHouseholdCollection } from '../hooks/useHouseholdCollection';
import { useHouseholdSettings } from '../hooks/useHouseholdSettings';
import { formatMoney } from '../utils/format';

export function DeudasScreen() {
  const { householdId } = useAuth();
  const { rows: deudas, add, remove } = useHouseholdCollection('debts', householdId, { column: 'created_at', ascending: false });
  const { moneda } = useHouseholdSettings();

  const [nombre, setNombre] = useState('');
  const [saldo, setSaldo] = useState('');
  const [cuota, setCuota] = useState('');
  const [tasa, setTasa] = useState('');

  async function handleAgregar() {
    const saldoNum = Number(saldo);
    const cuotaNum = Number(cuota);
    if (!nombre.trim() || !saldoNum || !cuotaNum) return;
    await add({ household_id: householdId!, nombre: nombre.trim(), saldo: saldoNum, cuota_mensual: cuotaNum, tasa_anual: Number(tasa) || 0 });
    setNombre('');
    setSaldo('');
    setCuota('');
    setTasa('');
  }

  const totalSaldo = deudas.reduce((a, d) => a + Number(d.saldo), 0);
  const totalCuota = deudas.reduce((a, d) => a + Number(d.cuota_mensual), 0);
  const cuotaConsolidada = totalCuota * 0.7;
  const liberado = totalCuota - cuotaConsolidada;

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Ej: Tarjeta X" value={nombre} onChangeText={setNombre} />
        <TextInput style={styles.input} placeholder="Saldo pendiente" keyboardType="numeric" value={saldo} onChangeText={setSaldo} />
        <TextInput style={styles.input} placeholder="Cuota mensual" keyboardType="numeric" value={cuota} onChangeText={setCuota} />
        <TextInput style={styles.input} placeholder="Tasa anual estimada (%)" keyboardType="numeric" value={tasa} onChangeText={setTasa} />
        <Pressable style={styles.submitBtn} onPress={handleAgregar}>
          <Text style={styles.submitBtnText}>+ Agregar deuda</Text>
        </Pressable>
      </View>

      {deudas.length > 0 ? (
        <View style={styles.simCard}>
          <Text style={styles.simTitle}>Simulación de consolidación</Text>
          <View style={styles.simRow}>
            <SimStat label="Deuda total" value={formatMoney(totalSaldo, moneda)} />
            <SimStat label="Cuota actual" value={`${formatMoney(totalCuota, moneda)}/mes`} />
          </View>
          <View style={styles.simRow}>
            <SimStat label="Cuota consolidada (est.)" value={`${formatMoney(cuotaConsolidada, moneda)}/mes`} />
            <SimStat label="Flujo liberado" value={`${formatMoney(liberado, moneda)}/mes`} color="#2F6F52" />
          </View>
          <Text style={styles.simDisclaimer}>
            Simulación estimada con fines ilustrativos. Sujeta a aprobación, tasa y condiciones de la entidad financiera elegible. No constituye
            asesoramiento financiero personalizado.
          </Text>
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={{ padding: 16, gap: 10 }}
        data={deudas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowNombre}>{item.nombre}</Text>
              <Text style={styles.rowMeta}>
                {formatMoney(item.cuota_mensual, moneda)}/mes · {item.tasa_anual}%
              </Text>
            </View>
            <Text style={styles.rowSaldo}>{formatMoney(item.saldo, moneda)}</Text>
            <Pressable onPress={() => remove(item.id)} style={{ marginLeft: 10 }}>
              <Text style={{ color: '#6E6E68' }}>✕</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Sin deudas registradas.</Text>}
      />
    </View>
  );
}

function SimStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.simLabel}>{label}</Text>
      <Text style={[styles.simValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF8EE' },
  form: { padding: 16, gap: 10, backgroundColor: '#fff', margin: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E1DCC8' },
  input: { borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 9, padding: 10, fontSize: 14, backgroundColor: '#FCFBF8' },
  submitBtn: { backgroundColor: '#0F5132', borderRadius: 10, padding: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '600' },
  simCard: { backgroundColor: '#E4F1EA', borderWidth: 1, borderColor: '#C7E2D3', borderRadius: 14, padding: 16, margin: 16, marginTop: 0, gap: 10 },
  simTitle: { fontWeight: '700', fontSize: 14 },
  simRow: { flexDirection: 'row', gap: 12 },
  simLabel: { fontSize: 11, color: '#6E6E68', fontWeight: '600' },
  simValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  simDisclaimer: { fontSize: 11, color: '#6E6E68' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 10, padding: 12 },
  rowNombre: { fontWeight: '700', fontSize: 13.5 },
  rowMeta: { fontSize: 11.5, color: '#6E6E68', marginTop: 2 },
  rowSaldo: { fontSize: 13.5, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#6E6E68', marginTop: 20 },
});
