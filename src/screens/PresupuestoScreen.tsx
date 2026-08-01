import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthProvider';
import { useHouseholdCollection } from '../hooks/useHouseholdCollection';
import { useMonthlyTransactions } from '../hooks/useMonthlyTransactions';
import { useHouseholdSettings } from '../hooks/useHouseholdSettings';
import { useCategories } from '../hooks/useCategories';
import { formatMoney } from '../utils/format';

export function PresupuestoScreen() {
  const { householdId } = useAuth();
  const { rows: limites, add, update, remove } = useHouseholdCollection('category_budgets', householdId);
  const { gastos } = useMonthlyTransactions(householdId);
  const { monthlyBudgetTotal, moneda } = useHouseholdSettings();
  const { categories } = useCategories();

  const [categoriaId, setCategoriaId] = useState('vivienda');
  const [limite, setLimite] = useState('');

  const porCategoria: Record<string, number> = {};
  gastos.forEach((t) => {
    if (!t.category_id) return;
    porCategoria[t.category_id] = (porCategoria[t.category_id] || 0) + Number(t.monto);
  });
  const totalGastado = gastos.reduce((a, t) => a + Number(t.monto), 0);
  const presupuestoPct = monthlyBudgetTotal > 0 ? Math.min((totalGastado / monthlyBudgetTotal) * 100, 100) : 0;

  async function handleAgregar() {
    const monto = Number(limite);
    if (!monto || monto <= 0) return;
    const existente = limites.find((l) => l.category_id === categoriaId);
    if (existente) {
      await update(existente.id, { monthly_limit: monto });
    } else {
      await add({ household_id: householdId!, category_id: categoriaId, monthly_limit: monto });
    }
    setLimite('');
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>
          Presupuesto mensual total — {formatMoney(totalGastado, moneda)} / {formatMoney(monthlyBudgetTotal, moneda)} ({presupuestoPct.toFixed(0)}%)
        </Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${presupuestoPct}%` }]} />
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={categoriaId} onValueChange={setCategoriaId}>
            {categories.map((c) => (
              <Picker.Item key={c.id} label={c.label} value={c.id} />
            ))}
          </Picker>
        </View>
        <TextInput style={styles.input} placeholder="Límite mensual" keyboardType="numeric" value={limite} onChangeText={setLimite} />
        <Pressable style={styles.submitBtn} onPress={handleAgregar}>
          <Text style={styles.submitBtnText}>+ Definir límite</Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={{ padding: 16, gap: 10 }}
        data={limites}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const gastado = porCategoria[item.category_id] || 0;
          const pct = Math.min((gastado / item.monthly_limit) * 100, 100);
          const label = categories.find((c) => c.id === item.category_id)?.label ?? item.category_id;
          return (
            <View style={styles.limitCard}>
              <View style={styles.limitHeader}>
                <Text style={styles.limitLabel}>{label}</Text>
                <Pressable onPress={() => remove(item.id)}>
                  <Text style={{ color: '#6E6E68' }}>✕</Text>
                </Pressable>
              </View>
              <Text style={styles.limitAmounts}>
                {formatMoney(gastado, moneda)} de {formatMoney(item.monthly_limit, moneda)}
              </Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: gastado >= item.monthly_limit ? '#8C4A3B' : '#0F5132' }]} />
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>Sin límites por categoría todavía.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF8EE' },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 14, padding: 16, margin: 16, marginBottom: 0 },
  cardLabel: { fontSize: 12.5, color: '#6E6E68', marginBottom: 8 },
  barTrack: { height: 8, borderRadius: 999, backgroundColor: '#E1DCC8', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999, backgroundColor: '#0F5132' },
  form: { padding: 16, gap: 10, backgroundColor: '#fff', margin: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E1DCC8' },
  pickerWrap: { borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 9, backgroundColor: '#FCFBF8' },
  input: { borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 9, padding: 10, fontSize: 14, backgroundColor: '#FCFBF8' },
  submitBtn: { backgroundColor: '#0F5132', borderRadius: 10, padding: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '600' },
  limitCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 12, padding: 14 },
  limitHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  limitLabel: { fontWeight: '700', fontSize: 13.5 },
  limitAmounts: { fontSize: 12, color: '#6E6E68', marginVertical: 6 },
  emptyText: { textAlign: 'center', color: '#6E6E68', marginTop: 20 },
});
