import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthProvider';
import { useHouseholdCollection } from '../hooks/useHouseholdCollection';
import { useHouseholdSettings } from '../hooks/useHouseholdSettings';
import { useCategories } from '../hooks/useCategories';
import { supabase } from '../lib/supabase';
import { formatMoney } from '../utils/format';
import { todayISO } from '../utils/date';
import type { PaymentMethod } from '../types/db';

export function GastosProgramadosScreen() {
  const { householdId } = useAuth();
  const { rows: gastos, add, remove, update, reload } = useHouseholdCollection('scheduled_expenses', householdId, {
    column: 'fecha_pago',
    ascending: true,
  });
  const { moneda } = useHouseholdSettings();
  const { categories } = useCategories();

  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState('vivienda');
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState<PaymentMethod>('transferencia');

  async function handleAgregar() {
    const montoNum = Number(monto);
    if (!descripcion.trim() || !montoNum || montoNum <= 0) return;
    await add({
      household_id: householdId!,
      descripcion: descripcion.trim(),
      category_id: categoriaId,
      monto: montoNum,
      fecha_pago: todayISO(),
      fecha_recordatorio: todayISO(),
      metodo_pago: metodoPago,
    });
    setDescripcion('');
    setMonto('');
  }

  // Al marcar como pagado se crea la transacción real ligada por FK
  // (origin_scheduled_expense_id); al desmarcar, se borra esa misma
  // transacción por id — nunca por coincidencia de texto+monto (bug del
  // prototipo corregido).
  async function handleToggle(id: string, estadoActual: string, gasto: (typeof gastos)[number]) {
    const nuevoEstado = estadoActual === 'pagado' ? 'pendiente' : 'pagado';
    if (nuevoEstado === 'pagado') {
      await supabase.from('transactions').insert({
        household_id: householdId!,
        kind: 'gasto',
        monto: gasto.monto,
        descripcion: gasto.descripcion,
        occurred_on: todayISO(),
        medio: gasto.metodo_pago,
        category_id: gasto.category_id,
        subcategoria: 'Pago programado',
        naturaleza: 'fijo',
        esencial: true,
        origin_scheduled_expense_id: id,
      });
    } else {
      await supabase.from('transactions').delete().eq('origin_scheduled_expense_id', id);
    }
    await update(id, { status: nuevoEstado } as never);
    await reload();
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Ej: Alquiler, Netflix..." value={descripcion} onChangeText={setDescripcion} />
        <View style={styles.pickerWrap}>
          <Picker selectedValue={categoriaId} onValueChange={setCategoriaId}>
            {categories.map((c) => (
              <Picker.Item key={c.id} label={c.label} value={c.id} />
            ))}
          </Picker>
        </View>
        <TextInput style={styles.input} placeholder="Monto" keyboardType="numeric" value={monto} onChangeText={setMonto} />
        <View style={styles.pickerWrap}>
          <Picker selectedValue={metodoPago} onValueChange={(v) => setMetodoPago(v as PaymentMethod)}>
            <Picker.Item label="Efectivo" value="efectivo" />
            <Picker.Item label="Tarjeta" value="tarjeta" />
            <Picker.Item label="Transferencia" value="transferencia" />
          </Picker>
        </View>
        <Pressable style={styles.submitBtn} onPress={handleAgregar}>
          <Text style={styles.submitBtnText}>+ Programar gasto</Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={{ padding: 16, gap: 10 }}
        data={gastos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const pagado = item.status === 'pagado';
          return (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowDesc}>{item.descripcion}</Text>
                <Text style={styles.rowMeta}>vence {item.fecha_pago}</Text>
              </View>
              <Text style={styles.rowAmount}>{formatMoney(item.monto, moneda)}</Text>
              <Pressable
                style={[styles.estadoBtn, { backgroundColor: pagado ? '#E4F1EA' : '#F3E3DE' }]}
                onPress={() => handleToggle(item.id, item.status, item)}
              >
                <Text style={{ color: pagado ? '#2F6F52' : '#8C4A3B', fontSize: 11.5, fontWeight: '600' }}>
                  {pagado ? '✓ Pagado' : '⏱ Pendiente'}
                </Text>
              </Pressable>
              <Pressable onPress={() => remove(item.id)} style={{ marginLeft: 10 }}>
                <Text style={{ color: '#6E6E68' }}>✕</Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>Sin gastos programados.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF8EE' },
  form: { padding: 16, gap: 10, backgroundColor: '#fff', margin: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E1DCC8' },
  input: { borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 9, padding: 10, fontSize: 14, backgroundColor: '#FCFBF8' },
  pickerWrap: { borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 9, backgroundColor: '#FCFBF8' },
  submitBtn: { backgroundColor: '#0F5132', borderRadius: 10, padding: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 10, padding: 12 },
  rowDesc: { fontWeight: '600', fontSize: 13.5 },
  rowMeta: { fontSize: 11, color: '#6E6E68', marginTop: 2 },
  rowAmount: { fontSize: 13, fontWeight: '700', marginRight: 8 },
  estadoBtn: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  emptyText: { textAlign: 'center', color: '#6E6E68', marginTop: 20 },
});
