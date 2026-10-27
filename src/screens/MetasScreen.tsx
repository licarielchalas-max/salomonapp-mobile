import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { TextInput } from '../components/AppTextInput';
import { Text } from '../components/AppText';
import { Sheet } from '../components/budget/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthProvider';
import { useGoals } from '../hooks/useGoals';
import { useAccounts } from '../hooks/useAccounts';
import { AccountPicker } from '../components/AccountPicker';
import { fundingFor, fundsErrorBase, type AccountRef } from '../lib/money';
import { colors, spacing, radius, shadow, glass } from '../theme';

function fmt(n: number) {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <View style={barStyles.track}>
      <View style={[barStyles.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
    </View>
  );
}
const barStyles = StyleSheet.create({
  track: { height: 8, backgroundColor: 'rgba(0,0,0,0.07)', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});

export function MetasScreen() {
  const { householdId } = useAuth();
  const { goals, loading, addGoal, addContribution, updateGoal, deleteGoal } = useGoals(householdId);
  const { accounts, find: findAccount, reload: reloadAccounts } = useAccounts(householdId);

  // Modal: add goal
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalAccount, setGoalAccount] = useState<AccountRef | null>(null);
  const [goalInitialDeposit, setGoalInitialDeposit] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  // Modal: edit goal
  const [editGoal, setEditGoal] = useState<(typeof goals)[number] | null>(null);
  const [editName, setEditName] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal: contribute
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [contribAccount, setContribAccount] = useState<AccountRef | null>(null);
  const [savingContrib, setSavingContrib] = useState(false);

  const emergency = goals.find((g) => g.nombre.toLowerCase().includes('emergencia') || g.nombre.toLowerCase().includes('fondo')) ?? goals[0];
  const others = goals.filter((g) => g !== emergency);

  async function handleAddGoal() {
    const target = parseFloat(goalTarget.replace(',', '.'));
    if (!goalName.trim() || !target || target <= 0) {
      Alert.alert('Datos inválidos', 'Ingresa nombre y monto objetivo.');
      return;
    }
    const initial = parseFloat(goalInitialDeposit.replace(',', '.')) || 0;
    if (initial > 0) {
      if (!goalAccount) { Alert.alert('Elige una cuenta', 'Indica de qué cuenta sale el monto inicial.'); return; }
      const noFunds = fundsErrorBase(findAccount(goalAccount), initial);
      if (noFunds) { Alert.alert('Sin fondos', noFunds); return; }
    }
    setSavingGoal(true);
    const { error, goalId } = await addGoalWithId({ nombre: goalName.trim(), target_amount: target });
    if (error) { setSavingGoal(false); Alert.alert('Error', error); return; }

    // Aporte inicial: sale de la cuenta elegida
    if (goalId && initial > 0 && goalAccount) {
      const res = await addContribution(goalId, initial, goalAccount, fundingFor(findAccount(goalAccount), initial));
      if (res.error) Alert.alert('La meta se creó, pero no se pudo hacer el aporte inicial', res.error);
    }
    setSavingGoal(false);
    setShowAddGoal(false);
    setGoalName(''); setGoalTarget(''); setGoalAccount(null); setGoalInitialDeposit('');
    reloadAccounts();
  }

  // Wrapper that returns the created goal id
  async function addGoalWithId(input: { nombre: string; target_amount: number }) {
    const { supabase } = require('../lib/supabase');
    if (!householdId) return { error: 'No hay sesión activa.', goalId: null };
    const { data, error } = await supabase
      .from('goals')
      .insert({ ...input, household_id: householdId, current_amount: 0 })
      .select('id')
      .single();
    return { error: error?.message ?? null, goalId: data?.id ?? null };
  }

  async function handleContribute() {
    const amount = parseFloat(contributeAmount.replace(',', '.'));
    if (!contributeGoalId || !amount || amount <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un aporte mayor a 0.');
      return;
    }
    if (!contribAccount) {
      Alert.alert('Elige una cuenta', 'Indica de qué cuenta sale el aporte.');
      return;
    }
    const noFunds = fundsErrorBase(findAccount(contribAccount), amount);
    if (noFunds) {
      Alert.alert('Sin fondos', noFunds);
      return;
    }
    setSavingContrib(true);
    const { error } = await addContribution(contributeGoalId, amount, contribAccount, fundingFor(findAccount(contribAccount), amount));
    setSavingContrib(false);
    if (error) Alert.alert('No se pudo aportar', error);
    else {
      setContributeGoalId(null);
      setContributeAmount('');
      setContribAccount(null);
      reloadAccounts();
    }
  }

  function openEdit(g: (typeof goals)[number]) {
    setEditGoal(g);
    setEditName(g.nombre);
    setEditTarget(String(g.target_amount));
  }

  async function saveEdit() {
    if (!editGoal) return;
    const target = parseFloat(editTarget.replace(/,/g, ''));
    if (!editName.trim()) return Alert.alert('Falta el nombre', 'Escribe cómo se llama la meta.');
    if (!target || target <= 0) return Alert.alert('Objetivo inválido', 'Ingresa un monto objetivo mayor a 0.');
    setSavingEdit(true);
    const { error } = await updateGoal(editGoal.id, { nombre: editName.trim(), target_amount: target });
    setSavingEdit(false);
    if (error) return Alert.alert('No se pudo guardar', error);
    setEditGoal(null);
  }

  function openContribute(goalId: string) {
    setContributeGoalId(goalId);
    setContributeAmount('');
    setContribAccount(null);
  }

  function confirmDelete(id: string, name: string) {
    Alert.alert('Eliminar meta', `¿Eliminar "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteGoal(id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[colors.bgDeep, colors.bg]} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {loading ? (
          <ActivityIndicator color={colors.navy} style={{ marginTop: 40 }} />
        ) : goals.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emergencyTip}>
              <Text style={styles.emergencyTipTitle}>🆘 Fondo de Emergencia</Text>
              <Text style={styles.emergencyTipBody}>
                Tu primera meta debe ser un fondo de emergencia equivalente a 2 meses de tu salario base.{'\n\n'}
                Cubre imprevistos: pérdida de empleo, gastos médicos, reparaciones urgentes.{'\n\n'}
                Si lo usas, tienes que reponerlo.
              </Text>
            </View>
            <Pressable style={styles.addFirstBtn} onPress={() => { setGoalName('Fondo de Emergencia'); setGoalTarget(''); setShowAddGoal(true); }}>
              <Text style={styles.addFirstBtnText}>Crear Fondo de Emergencia</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Emergency fund hero */}
            {emergency && (
              <View style={styles.emergencyCard}>
                <View style={styles.emergencyHeader}>
                  <Text style={styles.emergencyIcon}>🆘</Text>
                  <View style={styles.emergencyInfo}>
                    <Text style={styles.emergencyTitle}>{emergency.nombre}</Text>
                    <Text style={styles.emergencySubtitle}>Meta principal · 2 salarios base</Text>
                  </View>
                </View>

                <View style={styles.emergencyStats}>
                  <View>
                    <Text style={styles.eStatLabel}>Ahorrado</Text>
                    <Text style={styles.eStatValue}>¤{fmt(Number(emergency.current_amount))}</Text>
                  </View>
                  <View>
                    <Text style={styles.eStatLabel}>Objetivo</Text>
                    <Text style={styles.eStatValue}>¤{fmt(Number(emergency.target_amount))}</Text>
                  </View>
                  <View>
                    <Text style={styles.eStatLabel}>Falta</Text>
                    <Text style={[styles.eStatValue, { color: colors.gold }]}>
                      ¤{fmt(Math.max(0, Number(emergency.target_amount) - Number(emergency.current_amount)))}
                    </Text>
                  </View>
                </View>

                <ProgressBar value={Number(emergency.current_amount)} total={Number(emergency.target_amount)} color={colors.gold} />
                <Text style={styles.emergencyPct}>
                  {emergency.target_amount > 0 ? Math.round((Number(emergency.current_amount) / Number(emergency.target_amount)) * 100) : 0}% completado
                </Text>

                <View style={styles.emergencyActions}>
                  <Pressable style={styles.aportarBtn} onPress={() => openContribute(emergency.id)}>
                    <Text style={styles.aportarBtnText}>+ Aportar</Text>
                  </Pressable>
                  <Pressable style={styles.deleteIconBtn} onPress={() => openEdit(emergency)} accessibilityLabel={`Editar ${emergency.nombre}`}>
                    <Text style={styles.editIconText}>Editar</Text>
                  </Pressable>
                  <Pressable style={styles.deleteIconBtn} onPress={() => confirmDelete(emergency.id, emergency.nombre)}>
                    <Text style={styles.deleteIconText}>🗑</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Other goals */}
            {others.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>OTRAS METAS</Text>
                {others.map((goal) => {
                  const pct = goal.target_amount > 0 ? Math.round((Number(goal.current_amount) / Number(goal.target_amount)) * 100) : 0;
                  return (
                    <View key={goal.id} style={styles.goalCard}>
                      <View style={styles.goalHeader}>
                        <View style={styles.goalLeft}>
                          <Text style={styles.goalName}>{goal.nombre}</Text>
                          <Text style={styles.goalSaved}>
                            ¤{fmt(Number(goal.current_amount))} / ¤{fmt(Number(goal.target_amount))}
                          </Text>
                        </View>
                        <Text style={styles.goalPct}>{pct}%</Text>
                      </View>
                      <View style={styles.goalTrack}>
                        <View style={[styles.goalFill, { width: `${pct}%` as any }]} />
                      </View>
                      <View style={styles.goalActions}>
                        <Pressable style={styles.goalAportarBtn} onPress={() => openContribute(goal.id)}>
                          <Text style={styles.goalAportarText}>+ Aportar</Text>
                        </Pressable>
                        <Pressable onPress={() => openEdit(goal)} accessibilityLabel={`Editar ${goal.nombre}`}>
                          <Text style={styles.goalEditText}>Editar</Text>
                        </Pressable>
                        <Pressable onPress={() => confirmDelete(goal.id, goal.nombre)}>
                          <Text style={styles.goalDeleteText}>Eliminar</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </>
        )}

        <Pressable style={styles.newGoalBtn} onPress={() => { setGoalName(''); setGoalTarget(''); setGoalAccount(null); setGoalInitialDeposit(''); setShowAddGoal(true); }}>
          <Text style={styles.newGoalText}>+ Nueva Meta</Text>
        </Pressable>
      </ScrollView>

      {/* Modal: Add Goal */}
      <Sheet visible={showAddGoal} onClose={() => setShowAddGoal(false)} title="Nueva Meta">
<Text style={styles.modalLabel}>Nombre de la meta</Text>
              <TextInput style={styles.modalInput} value={goalName} onChangeText={setGoalName} placeholder="Ej: Vacaciones, Casa, Auto…" placeholderTextColor={colors.muted} />

              <Text style={[styles.modalLabel, { marginTop: spacing.sm }]}>Monto objetivo (¤)</Text>
              <TextInput style={styles.modalInput} value={goalTarget} onChangeText={setGoalTarget} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" />

              {/* Monto inicial: sale de una cuenta */}
              {/* Initial deposit */}
              <Text style={[styles.modalLabel, { marginTop: spacing.sm }]}>MONTO INICIAL (OPCIONAL)</Text>
              <TextInput
                style={styles.modalInput}
                value={goalInitialDeposit}
                onChangeText={setGoalInitialDeposit}
                placeholder="0.00 — con cuánto empiezas hoy"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
              />
              {parseFloat(goalInitialDeposit || '0') > 0 && (
                <View style={{ marginTop: spacing.md }}>
                  <AccountPicker
                    accounts={accounts}
                    value={goalAccount}
                    onChange={setGoalAccount}
                    amount={parseFloat(goalInitialDeposit) || 0}
                    amountBase
                    label="¿De qué cuenta sale el monto inicial?"
                  />
                </View>
              )}

              <Pressable style={styles.modalBtn} onPress={handleAddGoal} disabled={savingGoal}>
                {savingGoal ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalBtnText}>Crear Meta</Text>}
              </Pressable>
      </Sheet>

      {/* Modal: Contribute */}
      <Sheet visible={!!editGoal} onClose={() => setEditGoal(null)} title="Editar meta">
        <Text style={styles.modalLabel}>Nombre de la meta</Text>
        <TextInput style={styles.modalInput} value={editName} onChangeText={setEditName} placeholder="Ej: Vacaciones, Casa, Auto…" placeholderTextColor={colors.muted} maxLength={60} />
        <Text style={[styles.modalLabel, { marginTop: spacing.sm }]}>Monto objetivo (¤)</Text>
        <TextInput style={styles.modalInput} value={editTarget} onChangeText={setEditTarget} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" />
        <Text style={{ fontSize: 12, color: colors.onDarkMuted, lineHeight: 17 }}>
          Para cambiar cuánto llevas ahorrado, usa Aportar. Lo ahorrado no cambia al editar.
        </Text>
        <Pressable style={styles.modalBtn} onPress={saveEdit} disabled={savingEdit}>
          {savingEdit ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalBtnText}>Guardar cambios</Text>}
        </Pressable>
      </Sheet>

      <Sheet visible={!!contributeGoalId} onClose={() => setContributeGoalId(null)} title="Aportar a Meta">
<Text style={styles.modalLabel}>Monto del aporte (¤)</Text>
            <TextInput
              style={styles.modalInput}
              value={contributeAmount}
              onChangeText={setContributeAmount}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              autoFocus
            />

            <View style={{ marginTop: spacing.md }}>
              <AccountPicker
                accounts={accounts}
                value={contribAccount}
                onChange={setContribAccount}
                amount={parseFloat(contributeAmount.replace(',', '.')) || 0}
                amountBase
                label="¿De qué cuenta sale el aporte?"
              />
            </View>

            <Pressable style={[styles.modalBtn, { backgroundColor: colors.green }]} onPress={handleContribute} disabled={savingContrib}>
              {savingContrib ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalBtnText}>Confirmar Aporte</Text>}
            </Pressable>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 130 },

  emptyWrap: { gap: spacing.lg },
  emergencyTip: { backgroundColor: colors.bgDeep, borderRadius: radius.lg, padding: spacing.xl },
  emergencyTipTitle: { fontSize: 18, fontWeight: '700', color: colors.gold, marginBottom: spacing.md },
  emergencyTipBody: { fontSize: 14, color: colors.onDarkMuted, lineHeight: 22 },
  addFirstBtn: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  addFirstBtnText: { fontSize: 15, fontWeight: '700', color: '#3A2E06' },

  emergencyCard: { backgroundColor: colors.bgDeep, borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.lg, ...shadow.hero },
  emergencyHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  emergencyIcon: { fontSize: 36 },
  emergencyInfo: { flex: 1 },
  emergencyTitle: { fontSize: 17, fontWeight: '700', color: colors.onDark, marginBottom: 2 },
  emergencySubtitle: { fontSize: 12, color: colors.onDarkMuted },
  emergencyStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  eStatLabel: { fontSize: 10, color: colors.onDarkMuted, marginBottom: 4 },
  eStatValue: { fontSize: 17, fontWeight: '700', color: colors.onDark },
  emergencyPct: { fontSize: 11, color: colors.onDarkMuted, marginTop: spacing.sm, marginBottom: spacing.lg },
  emergencyActions: { flexDirection: 'row', gap: spacing.md },
  aportarBtn: { flex: 1, backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  aportarBtnText: { fontSize: 14, fontWeight: '700', color: '#3A2E06' },
  deleteIconBtn: { paddingHorizontal: 16, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(0,0,0,0.14)', justifyContent: 'center' },
  deleteIconText: { fontSize: 16 },

  sectionTitle: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2, marginBottom: spacing.md, marginTop: spacing.md },

  goalCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  goalLeft: { flex: 1 },
  goalName: { fontSize: 15, fontWeight: '700', color: colors.onDark, marginBottom: 3 },
  goalSaved: { fontSize: 12, color: colors.onDarkMuted },
  goalPct: { fontSize: 18, fontWeight: '700', color: colors.gold },
  goalTrack: { height: 6, backgroundColor: colors.line, borderRadius: 3, overflow: 'hidden', marginBottom: spacing.md },
  goalFill: { height: '100%', backgroundColor: colors.gold, borderRadius: 3 },
  goalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editIconText: { fontSize: 12, fontWeight: '700', color: colors.gold },
  goalEditText: { fontSize: 12.5, fontWeight: '700', color: colors.gold, marginRight: 14 },
  goalAportarBtn: { backgroundColor: colors.bgDeep, borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 20 },
  goalAportarText: { fontSize: 13, fontWeight: '700', color: colors.onDark },
  goalDeleteText: { fontSize: 12, color: colors.onDarkMuted },

  newGoalBtn: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: spacing.lg },
  newGoalText: { fontSize: 15, fontWeight: '700', color: '#3A2E06' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xxl, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.gold, marginBottom: spacing.md },
  modalLabel: { fontSize: 11, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1, marginBottom: spacing.sm },
  modalInput: { backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: 16, color: colors.onDark, marginBottom: spacing.xs },
  modalBtn: { backgroundColor: colors.bgDeep, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: spacing.lg },
  modalBtnText: { fontSize: 15, fontWeight: '700', color: colors.onDark },

  accountNote: { fontSize: 12, color: colors.green, fontWeight: '600', marginBottom: spacing.sm },
  noAccountNote: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: spacing.sm },
  noAccountNoteText: { fontSize: 13, color: colors.onDarkMuted, lineHeight: 19 },
});
