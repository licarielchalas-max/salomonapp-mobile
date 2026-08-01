import React, { useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthProvider';
import { useMonthlyTransactions } from '../hooks/useMonthlyTransactions';
import { useCategories } from '../hooks/useCategories';
import { useHouseholdSettings } from '../hooks/useHouseholdSettings';
import { formatMoney } from '../utils/format';
import { todayISO } from '../utils/date';
import type { PaymentMethod, TransactionKind } from '../types/db';

export function MovimientosScreen() {
  const { householdId, memberId } = useAuth();
  const { transactions, addTransaction, deleteTransaction } = useMonthlyTransactions(householdId);
  const { categories } = useCategories();
  const { moneda } = useHouseholdSettings();

  const [tipo, setTipo] = useState<TransactionKind>('gasto');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState('vivienda');
  const [subcategoria, setSubcategoria] = useState('');
  const [medio, setMedio] = useState<PaymentMethod>('tarjeta');
  const [fecha, setFecha] = useState(todayISO());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriaActual = categories.find((c) => c.id === categoriaId);

  async function handleSubmit() {
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0 || !descripcion.trim()) {
      setError('Ingresa un monto válido y una descripción.');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: submitError } = await addTransaction({
      member_id: memberId,
      kind: tipo,
      monto: montoNum,
      descripcion: descripcion.trim(),
      occurred_on: fecha,
      medio,
      category_id: tipo === 'gasto' ? categoriaId : null,
      subcategoria: tipo === 'gasto' ? subcategoria || categoriaActual?.subcategories[0] || null : null,
      naturaleza: tipo === 'gasto' ? 'variable' : null,
      esencial: tipo === 'gasto' ? true : null,
      fuente: tipo === 'ingreso' ? descripcion.trim() : null,
      frecuencia: tipo === 'ingreso' ? 'mensual' : null,
    });
    setSaving(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    setMonto('');
    setDescripcion('');
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <View style={styles.tipoRow}>
          <Pressable style={[styles.tipoBtn, tipo === 'gasto' && styles.tipoBtnActive]} onPress={() => setTipo('gasto')}>
            <Text style={[styles.tipoBtnText, tipo === 'gasto' && styles.tipoBtnTextActive]}>Gasto</Text>
          </Pressable>
          <Pressable style={[styles.tipoBtn, tipo === 'ingreso' && styles.tipoBtnActive]} onPress={() => setTipo('ingreso')}>
            <Text style={[styles.tipoBtnText, tipo === 'ingreso' && styles.tipoBtnTextActive]}>Ingreso</Text>
          </Pressable>
        </View>

        <TextInput style={styles.input} placeholder="Monto" keyboardType="numeric" value={monto} onChangeText={setMonto} />
        <TextInput style={styles.input} placeholder="Descripción" value={descripcion} onChangeText={setDescripcion} />

        {tipo === 'gasto' ? (
          <>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={categoriaId}
                onValueChange={(value) => {
                  setCategoriaId(value);
                  setSubcategoria('');
                }}
              >
                {categories.map((c) => (
                  <Picker.Item key={c.id} label={c.label} value={c.id} />
                ))}
              </Picker>
            </View>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={subcategoria || categoriaActual?.subcategories[0]} onValueChange={setSubcategoria}>
                {(categoriaActual?.subcategories ?? []).map((s) => (
                  <Picker.Item key={s} label={s} value={s} />
                ))}
              </Picker>
            </View>
          </>
        ) : null}

        <View style={styles.pickerWrap}>
          <Picker selectedValue={medio} onValueChange={(v) => setMedio(v as PaymentMethod)}>
            <Picker.Item label="Efectivo" value="efectivo" />
            <Picker.Item label="Tarjeta" value="tarjeta" />
            <Picker.Item label="Transferencia" value="transferencia" />
          </Picker>
        </View>

        <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text>{fecha}</Text>
        </Pressable>
        {showDatePicker ? (
          <DateTimePicker
            value={new Date(fecha)}
            mode="date"
            onChange={(_event, date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) setFecha(date.toISOString().slice(0, 10));
            }}
          />
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
          <Text style={styles.submitBtnText}>{saving ? 'Guardando…' : '+ Registrar movimiento'}</Text>
        </Pressable>
      </View>

      <FlatList
        style={styles.list}
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowDesc}>{item.descripcion}</Text>
              <Text style={styles.rowMeta}>{item.occurred_on}</Text>
            </View>
            <Text style={[styles.rowAmount, { color: item.kind === 'ingreso' ? '#2F6F52' : '#8C4A3B' }]}>
              {item.kind === 'ingreso' ? '+' : '-'}
              {formatMoney(item.monto, moneda)}
            </Text>
            <Pressable onPress={() => deleteTransaction(item.id)} style={{ marginLeft: 10 }}>
              <Text style={{ color: '#6E6E68' }}>✕</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Sin movimientos este mes.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF8EE' },
  form: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E1DCC8', gap: 10 },
  tipoRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  tipoBtn: { flex: 1, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E1DCC8', alignItems: 'center' },
  tipoBtnActive: { backgroundColor: '#0F5132', borderColor: '#0F5132' },
  tipoBtnText: { fontWeight: '600', color: '#2C2C2C' },
  tipoBtnTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 9, padding: 10, fontSize: 14, backgroundColor: '#FCFBF8' },
  pickerWrap: { borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 9, backgroundColor: '#FCFBF8' },
  submitBtn: { backgroundColor: '#0F5132', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#fff', fontWeight: '600' },
  error: { color: '#8C4A3B', fontSize: 12.5 },
  list: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E1DCC8',
    borderRadius: 10,
    padding: 12,
  },
  rowDesc: { fontSize: 13.5, fontWeight: '600', color: '#2C2C2C' },
  rowMeta: { fontSize: 11.5, color: '#6E6E68', marginTop: 2 },
  rowAmount: { fontSize: 13.5, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#6E6E68', marginTop: 20 },
});
