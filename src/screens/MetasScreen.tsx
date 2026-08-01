import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthProvider';
import { useHouseholdCollection } from '../hooks/useHouseholdCollection';
import { useHouseholdSettings } from '../hooks/useHouseholdSettings';
import { supabase } from '../lib/supabase';
import { formatMoney } from '../utils/format';

export function MetasScreen() {
  const { householdId } = useAuth();
  const { rows: metas, add, remove, reload } = useHouseholdCollection('goals', householdId, {
    column: 'created_at',
    ascending: false,
  });
  const { moneda } = useHouseholdSettings();

  const [nombre, setNombre] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [actual, setActual] = useState('');
  const [aportes, setAportes] = useState<Record<string, string>>({});

  async function handleAgregar() {
    const objetivoNum = Number(objetivo);
    if (!nombre.trim() || !objetivoNum || objetivoNum <= 0) return;
    await add({
      household_id: householdId!,
      nombre: nombre.trim(),
      target_amount: objetivoNum,
      current_amount: Number(actual) || 0,
    });
    setNombre('');
    setObjetivo('');
    setActual('');
  }

  async function handleAportar(goalId: string, currentAmount: number) {
    const monto = Number(aportes[goalId]);
    if (!monto || monto <= 0) return;
    await supabase.from('goal_contributions').insert({ goal_id: goalId, monto });
    await supabase.from('goals').update({ current_amount: currentAmount + monto }).eq('id', goalId);
    setAportes((prev) => ({ ...prev, [goalId]: '' }));
    await reload();
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Ej: Fondo de emergencia" value={nombre} onChangeText={setNombre} />
        <TextInput style={styles.input} placeholder="Monto objetivo" keyboardType="numeric" value={objetivo} onChangeText={setObjetivo} />
        <TextInput style={styles.input} placeholder="Monto ya ahorrado (opcional)" keyboardType="numeric" value={actual} onChangeText={setActual} />
        <Pressable style={styles.submitBtn} onPress={handleAgregar}>
          <Text style={styles.submitBtnText}>+ Crear meta</Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={{ padding: 16, gap: 12 }}
        data={metas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const pct = Math.min((item.current_amount / item.target_amount) * 100, 100);
          return (
            <View style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <View>
                  <Text style={styles.goalNombre}>{item.nombre}</Text>
                  <Text style={styles.goalProgreso}>
                    {formatMoney(item.current_amount, moneda)} / {formatMoney(item.target_amount, moneda)}
                  </Text>
                </View>
                <Pressable onPress={() => remove(item.id)}>
                  <Text style={{ color: '#6E6E68' }}>✕</Text>
                </Pressable>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${pct}%` }]} />
              </View>
              <View style={styles.aporteRow}>
                <Text style={styles.pctText}>{pct.toFixed(0)}% completado</Text>
                <TextInput
                  style={styles.aporteInput}
                  placeholder="Monto"
                  keyboardType="numeric"
                  value={aportes[item.id] ?? ''}
                  onChangeText={(v) => setAportes((prev) => ({ ...prev, [item.id]: v }))}
                />
                <Pressable style={styles.aporteBtn} onPress={() => handleAportar(item.id, item.current_amount)}>
                  <Text style={styles.aporteBtnText}>+ Aportar</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>Sin metas de ahorro todavía.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF8EE' },
  form: { padding: 16, gap: 10, backgroundColor: '#fff', margin: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E1DCC8' },
  input: { borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 9, padding: 10, fontSize: 14, backgroundColor: '#FCFBF8' },
  submitBtn: { backgroundColor: '#0F5132', borderRadius: 10, padding: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '600' },
  goalCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 14, padding: 16 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  goalNombre: { fontWeight: '700', fontSize: 14.5 },
  goalProgreso: { fontSize: 12.5, color: '#6E6E68', marginTop: 2 },
  barTrack: { height: 8, borderRadius: 999, backgroundColor: '#E1DCC8', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999, backgroundColor: '#C9A227' },
  aporteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  pctText: { fontSize: 12, color: '#6E6E68', flex: 1 },
  aporteInput: { width: 80, borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 8, padding: 8, fontSize: 12.5, backgroundColor: '#FCFBF8' },
  aporteBtn: { borderWidth: 1, borderColor: '#E1DCC8', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 },
  aporteBtnText: { fontSize: 12, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#6E6E68', marginTop: 20 },
});
