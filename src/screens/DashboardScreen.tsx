import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthProvider';
import { useMonthlyTransactions } from '../hooks/useMonthlyTransactions';
import { useHouseholdSettings } from '../hooks/useHouseholdSettings';
import { useCategories } from '../hooks/useCategories';
import { formatMoney } from '../utils/format';

export function DashboardScreen() {
  const { householdId } = useAuth();
  const { monthLabel, totalGastos, totalIngresos, balance, gastos, loading, reload } = useMonthlyTransactions(householdId);
  const { monthlyBudgetTotal, moneda, nombreUsuario } = useHouseholdSettings();
  const { categories } = useCategories();

  const porCategoria: Record<string, number> = {};
  gastos.forEach((t) => {
    if (!t.category_id) return;
    porCategoria[t.category_id] = (porCategoria[t.category_id] || 0) + Number(t.monto);
  });
  const categoryRows = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .map(([id, value]) => ({
      label: categories.find((c) => c.id === id)?.label ?? id,
      value,
    }));

  const presupuestoPct = monthlyBudgetTotal > 0 ? Math.min((totalGastos / monthlyBudgetTotal) * 100, 100) : 0;
  const presupuestoColor = monthlyBudgetTotal > 0 && totalGastos >= monthlyBudgetTotal ? '#8C4A3B' : '#0F5132';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
    >
      {nombreUsuario ? <Text style={styles.greeting}>Hola, {nombreUsuario}</Text> : null}
      <Text style={styles.title}>Resumen mensual</Text>
      <Text style={styles.monthBadge}>{monthLabel}</Text>

      <View style={styles.cardsRow}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Ingresos del mes</Text>
          <Text style={styles.cardValue}>{formatMoney(totalIngresos, moneda)}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Gastos del mes</Text>
          <Text style={styles.cardValue}>{formatMoney(totalGastos, moneda)}</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Balance neto</Text>
        <Text style={[styles.cardValue, { color: balance >= 0 ? '#2F6F52' : '#8C4A3B' }]}>{formatMoney(balance, moneda)}</Text>
      </View>

      {monthlyBudgetTotal > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>
            Presupuesto usado ({presupuestoPct.toFixed(0)}%) — {formatMoney(totalGastos, moneda)} / {formatMoney(monthlyBudgetTotal, moneda)}
          </Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${presupuestoPct}%`, backgroundColor: presupuestoColor }]} />
          </View>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Gastos por categoría</Text>
      {categoryRows.length === 0 ? (
        <Text style={styles.emptyText}>Aún no hay gastos registrados este mes.</Text>
      ) : (
        categoryRows.map((row) => (
          <View key={row.label} style={styles.categoryRow}>
            <Text style={styles.categoryLabel}>{row.label}</Text>
            <Text style={styles.categoryValue}>{formatMoney(row.value, moneda)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF8EE' },
  greeting: { fontSize: 13, color: '#0F5132', fontWeight: '600', marginBottom: 2 },
  title: { fontSize: 24, fontWeight: '700', color: '#0F5132', fontFamily: undefined },
  monthBadge: { fontSize: 12, color: '#0F5132', marginBottom: 16, marginTop: 2 },
  cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardLabel: { fontSize: 12, color: '#6E6E68', fontWeight: '600', marginBottom: 6 },
  cardValue: { fontSize: 20, fontWeight: '700', color: '#2C2C2C' },
  barTrack: { height: 8, borderRadius: 999, backgroundColor: '#E1DCC8', overflow: 'hidden', marginTop: 8 },
  barFill: { height: '100%', borderRadius: 999 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F5132', marginTop: 8, marginBottom: 10 },
  emptyText: { fontSize: 13, color: '#6E6E68' },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E1DCC8',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  categoryLabel: { fontSize: 13, color: '#2C2C2C' },
  categoryValue: { fontSize: 13, fontWeight: '600', color: '#2C2C2C' },
});
