import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthProvider';
import { useHouseholdCollection } from '../hooks/useHouseholdCollection';
import { useHouseholdSettings } from '../hooks/useHouseholdSettings';
import { formatMoney } from '../utils/format';
import type { WalletMovementType } from '../types/db';

const TIPO_LABELS: Record<WalletMovementType, string> = {
  entrada: 'Entrada de efectivo',
  salida: 'Salida de efectivo',
  transferencia_a_banco: 'Transferencia cartera → banco',
  transferencia_de_banco: 'Transferencia banco → cartera',
};

export function CarteraScreen() {
  const { householdId, memberId } = useAuth();
  const { rows: movs, add, remove } = useHouseholdCollection('wallet_movements', householdId, {
    column: 'occurred_on',
    ascending: false,
  });
  const { walletInitialBalance, updateWalletInitialBalance, moneda } = useHouseholdSettings();

  const [tipo, setTipo] = useState<WalletMovementType>('entrada');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [saldoInicialInput, setSaldoInicialInput] = useState('');

  const saldo = movs.reduce((acc, m) => {
    const signo = m.tipo === 'entrada' || m.tipo === 'transferencia_de_banco' ? 1 : -1;
    return acc + signo * Number(m.monto);
  }, Number(walletInitialBalance || 0));

  async function handleAgregar() {
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) return;
    await add({
      household_id: householdId!,
      member_id: memberId,
      tipo,
      monto: montoNum,
      descripcion: descripcion || '—',
    });
    setMonto('');
    setDescripcion('');
  }

  return (
    <View style={styles.container}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Saldo actual en cartera</Text>
        <Text style={styles.balanceValue}>{formatMoney(saldo, moneda)}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Saldo inicial del mes</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            keyboardType="numeric"
            placeholder={String(walletInitialBalance)}
            value={saldoInicialInput}
            onChangeText={setSaldoInicialInput}
          />
          <Pressable
            style={styles.smallBtn}
            onPress={() => {
              updateWalletInitialBalance(Number(saldoInicialInput) || 0);
              setSaldoInicialInput('');
            }}
          >
            <Text style={styles.smallBtnText}>Guardar</Text>
          </Pressable>
        </View>

        <View style={styles.pickerWrap}>
          <Picker selectedValue={tipo} onValueChange={(v) => setTipo(v as WalletMovementType)}>
            {Object.entries(TIPO_LABELS).map(([value, label]) => (
              <Picker.Item key={value} label={label} value={value} />
            ))}
          </Picker>
        </View>
        <TextInput style={styles.input} placeholder="Monto" keyboardType="numeric" value={monto} onChangeText={setMonto} />
        <TextInput style={styles.input} placeholder="Descripción" value={descripcion} onChangeText={setDescripcion} />
        <Pressable style={styles.submitBtn} onPress={handleAgregar}>
          <Text style={styles.submitBtnText}>+ Registrar</Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={{ padding: 16, gap: 8 }}
        data={movs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const positivo = item.tipo === 'entrada' || item.tipo === 'transferencia_de_banco';
          return (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowDesc}>{item.descripcion}</Text>
                <Text style={styles.rowMeta}>
                  {TIPO_LABELS[item.tipo]} · {item.occurred_on}
                </Text>
              </View>
              <Text style={[styles.rowAmount, { color: positivo ? '#2F6F52' : '#8C4A3B' }]}>
                {positivo ? '+' : '-'}
                {formatMoney(item.monto, moneda)}
              </Text>
              <Pressable onPress={() => remove(item.id)} style={{ marginLeft: 10 }}>
                <Text style={{ color: '#6E6E68' }}>✕</Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>Sin movimientos de cartera.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF8EE' },
  balanceCard: { backgroundColor: '#0F5132', borderRadius: 14, padding: 20, margin: 16, marginBottom: 0 },
  balanceLabel: { color: '#D9E7DD', fontSize: 12 },
  balanceValue: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 4 },
  form: { padding: 16, gap: 10, backgroundColor: '#fff', margin: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E1DCC8' },
  label: { fontSize: 12.5, fontWeight: '600', color: '#6E6E68' },
  pickerWrap: { borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 9, backgroundColor: '#FCFBF8' },
  input: { borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 9, padding: 10, fontSize: 14, backgroundColor: '#FCFBF8' },
  smallBtn: { backgroundColor: '#0F5132', borderRadius: 9, paddingHorizontal: 14, justifyContent: 'center' },
  smallBtnText: { color: '#fff', fontWeight: '600', fontSize: 12.5 },
  submitBtn: { backgroundColor: '#0F5132', borderRadius: 10, padding: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 10, padding: 12 },
  rowDesc: { fontSize: 13.5, fontWeight: '600' },
  rowMeta: { fontSize: 11.5, color: '#6E6E68', marginTop: 2 },
  rowAmount: { fontSize: 13.5, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#6E6E68', marginTop: 20 },
});
