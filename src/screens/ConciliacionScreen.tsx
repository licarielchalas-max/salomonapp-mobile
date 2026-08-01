import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../lib/supabase';
import { formatMoney } from '../utils/format';
import { parseBankCsv } from '../utils/csv';
import { useHouseholdSettings } from '../hooks/useHouseholdSettings';
import type { ReconciliationItemRow } from '../types/db';

export function ConciliacionScreen() {
  const { householdId } = useAuth();
  const { moneda } = useHouseholdSettings();
  const [items, setItems] = useState<ReconciliationItemRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conciliados = items.filter((i) => i.estado === 'conciliado').length;
  const pendientes = items.length - conciliados;

  async function handleUpload() {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setLoading(true);
    try {
      const content = await FileSystem.readAsStringAsync(asset.uri);
      const rows = parseBankCsv(content);

      const { data: transacciones } = await supabase
        .from('transactions')
        .select('id, monto')
        .eq('household_id', householdId!)
        .eq('kind', 'gasto');

      const usados = new Set<string>();
      const resultado = rows.map((row) => {
        const match = (transacciones ?? []).find(
          (t) => !usados.has(t.id) && Math.abs(Number(t.monto) - row.monto) < 0.5
        );
        if (match) usados.add(match.id);
        return {
          fecha: row.fecha || null,
          descripcion: row.descripcion || null,
          monto: row.monto,
          matched_transaction_id: match?.id ?? null,
          estado: (match ? 'conciliado' : 'pendiente') as 'conciliado' | 'pendiente',
        };
      });

      const { data: run } = await supabase
        .from('reconciliation_runs')
        .insert({ household_id: householdId!, source_label: asset.name })
        .select('id')
        .single();

      if (run) {
        const { data: insertedItems } = await supabase
          .from('reconciliation_items')
          .insert(resultado.map((r) => ({ ...r, run_id: run.id })))
          .select('*');
        setItems(insertedItems ?? []);
      }
      setFileName(asset.name);
    } catch (e) {
      setError('No se pudo procesar el archivo. Verifica que tenga columnas fecha, descripcion, monto.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Sube tu extracto bancario en CSV con columnas <Text style={styles.mono}>fecha</Text>, <Text style={styles.mono}>descripcion</Text>,{' '}
          <Text style={styles.mono}>monto</Text>. Comparamos cada fila contra tus movimientos registrados en la app: si el monto coincide, queda{' '}
          <Text style={styles.bold}>conciliado</Text>; si no, queda <Text style={styles.bold}>pendiente</Text> — así detectas gastos que olvidaste
          anotar.
        </Text>
      </View>

      <Pressable style={styles.uploadBtn} onPress={handleUpload} disabled={loading}>
        <Text style={styles.uploadBtnText}>{loading ? 'Procesando…' : '⬆ Subir extracto (CSV)'}</Text>
      </Pressable>
      {fileName ? <Text style={styles.fileName}>{fileName}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {items.length > 0 ? (
        <View style={styles.badgesRow}>
          <Text style={[styles.badge, styles.badgeOk]}>{conciliados} conciliados</Text>
          <Text style={[styles.badge, styles.badgePending]}>{pendientes} pendientes</Text>
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={{ padding: 16, gap: 8 }}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowDesc}>{item.descripcion}</Text>
              <Text style={styles.rowMeta}>{item.fecha}</Text>
            </View>
            <Text style={styles.rowMonto}>{formatMoney(item.monto, moneda)}</Text>
            <Text style={[styles.estado, { color: item.estado === 'conciliado' ? '#2F6F52' : '#8C4A3B' }]}>
              {item.estado === 'conciliado' ? '✓ Conciliado' : '⏱ Pendiente'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF8EE' },
  infoBox: { backgroundColor: '#FCFBF8', borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 12, padding: 14, margin: 16, marginBottom: 12 },
  infoText: { fontSize: 12.5, color: '#6E6E68', lineHeight: 18 },
  mono: { fontFamily: 'monospace' },
  bold: { fontWeight: '700', color: '#0F5132' },
  uploadBtn: { backgroundColor: '#0F5132', borderRadius: 10, padding: 12, alignItems: 'center', marginHorizontal: 16 },
  uploadBtnText: { color: '#fff', fontWeight: '600' },
  fileName: { fontSize: 12, color: '#6E6E68', textAlign: 'center', marginTop: 8 },
  error: { fontSize: 12, color: '#8C4A3B', textAlign: 'center', marginTop: 8, marginHorizontal: 16 },
  badgesRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 14 },
  badge: { fontSize: 11.5, fontWeight: '600', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  badgeOk: { color: '#0F5132', backgroundColor: '#E3EFE7' },
  badgePending: { color: '#8C4A3B', backgroundColor: '#F3E3DE' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 10, padding: 12 },
  rowDesc: { fontWeight: '600', fontSize: 13 },
  rowMeta: { fontSize: 11, color: '#6E6E68', marginTop: 2 },
  rowMonto: { fontSize: 12.5, fontWeight: '700', marginRight: 8 },
  estado: { fontSize: 11.5, fontWeight: '600' },
});
