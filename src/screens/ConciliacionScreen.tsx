import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { TextInput } from '../components/AppTextInput';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthProvider';
import { useMonthlyTransactions } from '../hooks/useMonthlyTransactions';
import { useAccounts } from '../hooks/useAccounts';
import { AccountPicker } from '../components/AccountPicker';
import { baseCash, monedaFor, toDb, type AccountRef } from '../lib/money';
import { colors, spacing, radius, shadow, glass } from '../theme';

function fmt(n: number) {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Step = 'period' | 'import' | 'match' | 'done';

interface BankItem {
  id: string;
  descripcion: string;
  monto: number;
  fecha: string;
  matched: boolean;
  matchedTxId: string | null;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function ConciliacionScreen() {
  const { householdId } = useAuth();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const [step, setStep] = useState<Step>('period');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Bank statement items entered manually
  const [bankItems, setBankItems] = useState<BankItem[]>([]);
  const [newDesc, setNewDesc] = useState('');
  const [newMonto, setNewMonto] = useState('');
  const [newFecha, setNewFecha] = useState('');

  const { transactions, loading, addTransaction } = useMonthlyTransactions(householdId);
  const { accounts, reload: reloadAccounts } = useAccounts(householdId);
  // Cuenta a la que pertenece el extracto: los gastos que falten se registran contra ella.
  const [stmtAccount, setStmtAccount] = useState<AccountRef | null>(baseCash());

  // Filter transactions for selected period
  const periodTransactions = useMemo(() => {
    const monthStr = String(selectedMonth + 1).padStart(2, '0');
    const prefix = `${selectedYear}-${monthStr}`;
    return transactions.filter((t) => t.occurred_on.startsWith(prefix));
  }, [transactions, selectedMonth, selectedYear]);

  // Auto-match: find transaction with similar monto and description
  const matchedItems = useMemo(() => {
    return bankItems.map((item) => {
      const match = periodTransactions.find(
        (t) =>
          Math.abs(Number(t.monto) - Math.abs(item.monto)) < 0.01 ||
          t.descripcion.toLowerCase().includes(item.descripcion.toLowerCase().slice(0, 5))
      );
      return { ...item, matched: !!match, matchedTxId: match?.id ?? null };
    });
  }, [bankItems, periodTransactions]);

  const unmatched = matchedItems.filter((i) => !i.matched);
  const matched = matchedItems.filter((i) => i.matched);

  function addBankItem() {
    const montoVal = parseFloat(newMonto.replace(',', '.'));
    if (!newDesc.trim() || !montoVal) {
      Alert.alert('Datos incompletos', 'Ingresa descripción y monto.');
      return;
    }
    const fecha = newFecha.trim() || `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
    setBankItems((prev) => [...prev, {
      id: Date.now().toString(),
      descripcion: newDesc.trim(),
      monto: Math.abs(montoVal),
      fecha,
      matched: false,
      matchedTxId: null,
    }]);
    setNewDesc('');
    setNewMonto('');
    setNewFecha('');
  }

  async function registerUnmatched(item: BankItem) {
    if (!householdId) return;
    const { error } = await addTransaction({
      kind: 'gasto',
      monto: item.monto,
      descripcion: item.descripcion,
      occurred_on: item.fecha,
      ...toDb(stmtAccount ?? baseCash()),
      ...monedaFor(stmtAccount ?? baseCash()),
    });
    if (error) Alert.alert('No se pudo registrar', error);
    else {
      reloadAccounts();
      setBankItems((prev) => prev.map((b) => b.id === item.id ? { ...b, matched: true } : b));
      Alert.alert('Registrado', 'La transacción fue agregada a tus movimientos.');
    }
  }

  async function registerAllUnmatched() {
    for (const item of unmatched) {
      await registerUnmatched(item);
    }
    setStep('done');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Step indicator */}
      <View style={styles.stepBar}>
        {(['period', 'import', 'match', 'done'] as Step[]).map((s, i) => {
          const labels = ['Período', 'Extracto', 'Conciliar', 'Listo'];
          const active = step === s;
          const done = ['period', 'import', 'match', 'done'].indexOf(step) > i;
          return (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepDot, active && styles.stepDotActive, done && styles.stepDotDone]}>
                <Text style={[styles.stepDotText, (active || done) && { color: colors.onNavy }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, active && { color: colors.gold, fontWeight: '700' }]}>{labels[i]}</Text>
            </View>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* STEP 1: Select period */}
        {step === 'period' && (
          <View style={styles.stepCard}>
            <Text style={styles.stepTitle}>Seleccionar período</Text>
            <Text style={styles.stepSubtitle}>¿Qué mes vas a conciliar?</Text>

            <Text style={styles.fieldLabel}>AÑO</Text>
            <View style={styles.yearRow}>
              {[currentYear - 1, currentYear].map((y) => (
                <Pressable key={y} style={[styles.yearBtn, selectedYear === y && styles.yearBtnActive]} onPress={() => setSelectedYear(y)}>
                  <Text style={[styles.yearBtnText, selectedYear === y && styles.yearBtnTextActive]}>{y}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>MES</Text>
            <View style={styles.monthGrid}>
              {MONTHS.map((m, i) => (
                <Pressable
                  key={m}
                  style={[styles.monthBtn, selectedMonth === i && styles.monthBtnActive]}
                  onPress={() => setSelectedMonth(i)}
                >
                  <Text style={[styles.monthBtnText, selectedMonth === i && styles.monthBtnTextActive]}>
                    {m.slice(0, 3)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.periodSummary}>
              <Text style={styles.periodSummaryText}>
                Período seleccionado: <Text style={{ fontWeight: '700', color: colors.gold }}>{MONTHS[selectedMonth]} {selectedYear}</Text>
              </Text>
              {loading ? <ActivityIndicator color={colors.navy} /> : (
                <Text style={styles.periodTxCount}>
                  {periodTransactions.length} transacciones registradas
                </Text>
              )}
            </View>

            <Pressable style={styles.nextBtn} onPress={() => setStep('import')}>
              <Text style={styles.nextBtnText}>Continuar →</Text>
            </Pressable>
          </View>
        )}

        {/* STEP 2: Import bank statement */}
        {step === 'import' && (
          <View style={styles.stepCard}>
            <Text style={styles.stepTitle}>Extracto bancario</Text>
            <Text style={styles.stepSubtitle}>
              Ingresa los movimientos de tu estado de cuenta de {MONTHS[selectedMonth]} {selectedYear}
            </Text>

            <AccountPicker
              accounts={accounts}
              value={stmtAccount}
              onChange={setStmtAccount}
              mode="entrada"
              label="¿De qué cuenta es este extracto?"
            />

            {/* Add item form */}
            <View style={styles.addItemForm}>
              <TextInput
                style={styles.textInput}
                value={newDesc}
                onChangeText={setNewDesc}
                placeholder="Descripción del movimiento"
                placeholderTextColor={colors.muted}
              />
              <View style={styles.addItemRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={newMonto}
                  onChangeText={setNewMonto}
                  placeholder="Monto (¤)"
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={newFecha}
                  onChangeText={setNewFecha}
                  placeholder="Fecha YYYY-MM-DD"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <Pressable style={styles.addItemBtn} onPress={addBankItem}>
                <Text style={styles.addItemBtnText}>+ Agregar movimiento</Text>
              </Pressable>
            </View>

            {/* Items list */}
            {bankItems.length > 0 && (
              <View style={styles.itemsList}>
                <Text style={styles.itemsTitle}>{bankItems.length} movimiento{bankItems.length !== 1 ? 's' : ''} del extracto</Text>
                {bankItems.map((item) => (
                  <View key={item.id} style={styles.bankItem}>
                    <View style={styles.bankItemBody}>
                      <Text style={styles.bankItemDesc}>{item.descripcion}</Text>
                      <Text style={styles.bankItemDate}>{item.fecha}</Text>
                    </View>
                    <Text style={styles.bankItemAmount}>¤{fmt(item.monto)}</Text>
                    <Pressable onPress={() => setBankItems((prev) => prev.filter((b) => b.id !== item.id))}>
                      <Text style={styles.removeText}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.navRow}>
              <Pressable style={styles.backBtn} onPress={() => setStep('period')}>
                <Text style={styles.backBtnText}>← Atrás</Text>
              </Pressable>
              <Pressable
                style={[styles.nextBtn, { flex: 1 }]}
                onPress={() => { if (bankItems.length === 0) Alert.alert('Sin movimientos', 'Agrega al menos un movimiento del extracto.'); else setStep('match'); }}
              >
                <Text style={styles.nextBtnText}>Conciliar →</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* STEP 3: Match */}
        {step === 'match' && (
          <View style={styles.stepCard}>
            <Text style={styles.stepTitle}>Resultado de conciliación</Text>
            <Text style={styles.stepSubtitle}>{MONTHS[selectedMonth]} {selectedYear}</Text>

            {/* Summary stats */}
            <View style={styles.matchStats}>
              <View style={[styles.matchStat, { backgroundColor: colors.greenSoft }]}>
                <Text style={[styles.matchStatNum, { color: colors.green }]}>{matched.length}</Text>
                <Text style={styles.matchStatLabel}>Conciliados</Text>
              </View>
              <View style={[styles.matchStat, { backgroundColor: colors.rustSoft }]}>
                <Text style={[styles.matchStatNum, { color: colors.rust }]}>{unmatched.length}</Text>
                <Text style={styles.matchStatLabel}>Sin registrar</Text>
              </View>
              <View style={[styles.matchStat, { backgroundColor: colors.bg }]}>
                <Text style={[styles.matchStatNum, { color: colors.gold }]}>{periodTransactions.length}</Text>
                <Text style={styles.matchStatLabel}>En la app</Text>
              </View>
            </View>

            {/* Unmatched items */}
            {unmatched.length > 0 && (
              <>
                <Text style={styles.unmatchedTitle}>⚠️ No registrados en la app</Text>
                {unmatched.map((item) => (
                  <View key={item.id} style={styles.unmatchedCard}>
                    <View style={styles.unmatchedBody}>
                      <Text style={styles.unmatchedDesc}>{item.descripcion}</Text>
                      <Text style={styles.unmatchedDate}>{item.fecha}</Text>
                    </View>
                    <View style={styles.unmatchedRight}>
                      <Text style={styles.unmatchedAmount}>¤{fmt(item.monto)}</Text>
                      <Pressable style={styles.registerBtn} onPress={() => registerUnmatched(item)}>
                        <Text style={styles.registerBtnText}>Registrar</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
                <Pressable style={[styles.nextBtn, { backgroundColor: colors.rust }]} onPress={registerAllUnmatched}>
                  <Text style={styles.nextBtnText}>Registrar todos ({unmatched.length})</Text>
                </Pressable>
              </>
            )}

            {/* Matched items */}
            {matched.length > 0 && (
              <>
                <Text style={styles.matchedTitle}>✅ Conciliados</Text>
                {matched.map((item) => (
                  <View key={item.id} style={[styles.bankItem, { backgroundColor: colors.greenSoft }]}>
                    <View style={styles.bankItemBody}>
                      <Text style={[styles.bankItemDesc, { color: colors.green }]}>{item.descripcion}</Text>
                      <Text style={styles.bankItemDate}>{item.fecha}</Text>
                    </View>
                    <Text style={[styles.bankItemAmount, { color: colors.green }]}>¤{fmt(item.monto)}</Text>
                  </View>
                ))}
              </>
            )}

            {unmatched.length === 0 && (
              <View style={styles.allGoodCard}>
                <Text style={styles.allGoodIcon}>🎉</Text>
                <Text style={styles.allGoodTitle}>Conciliación completa</Text>
                <Text style={styles.allGoodDesc}>Todos los movimientos del extracto están registrados en la app</Text>
              </View>
            )}

            <View style={styles.navRow}>
              <Pressable style={styles.backBtn} onPress={() => setStep('import')}>
                <Text style={styles.backBtnText}>← Atrás</Text>
              </Pressable>
              <Pressable style={[styles.nextBtn, { flex: 1 }]} onPress={() => setStep('done')}>
                <Text style={styles.nextBtnText}>Finalizar ✓</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* STEP 4: Done */}
        {step === 'done' && (
          <View style={styles.doneCard}>
            <Text style={styles.doneIcon}>✅</Text>
            <Text style={styles.doneTitle}>Conciliación finalizada</Text>
            <Text style={styles.doneSubtitle}>{MONTHS[selectedMonth]} {selectedYear}</Text>
            <Text style={styles.doneBody}>
              Tus movimientos están sincronizados con tu estado de cuenta bancario.
            </Text>
            <Pressable style={styles.nextBtn} onPress={() => { setStep('period'); setBankItems([]); }}>
              <Text style={styles.nextBtnText}>Nueva conciliación</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 130 },

  stepBar: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.bgCard, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  stepDotActive: { backgroundColor: colors.bgDeep, borderColor: colors.navy },
  stepDotDone: { backgroundColor: colors.green, borderColor: colors.green },
  stepDotText: { fontSize: 12, fontWeight: '700', color: colors.onDarkMuted },
  stepLabel: { fontSize: 10, color: colors.onDarkMuted, fontWeight: '500' },

  stepCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.xl, borderWidth: 1, borderColor: colors.glassBorder, gap: spacing.md },
  stepTitle: { fontSize: 20, fontWeight: '700', color: colors.gold },
  stepSubtitle: { fontSize: 13, color: colors.onDarkMuted, marginTop: -spacing.sm },

  fieldLabel: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2, marginTop: spacing.sm },

  yearRow: { flexDirection: 'row', gap: spacing.md },
  yearBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', borderWidth: 1.5, borderColor: colors.glassBorder, backgroundColor: colors.bg },
  yearBtnActive: { backgroundColor: colors.bgDeep, borderColor: colors.navy },
  yearBtnText: { fontSize: 16, fontWeight: '700', color: colors.onDarkMuted },
  yearBtnTextActive: { color: colors.onDark },

  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  monthBtn: { width: '30%', paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.bg },
  monthBtnActive: { backgroundColor: colors.bgDeep, borderColor: colors.navy },
  monthBtnText: { fontSize: 13, fontWeight: '600', color: colors.onDarkMuted },
  monthBtnTextActive: { color: colors.onDark },

  periodSummary: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, gap: 4 },
  periodSummaryText: { fontSize: 13, color: colors.onDark },
  periodTxCount: { fontSize: 12, color: colors.onDarkMuted },

  nextBtn: { backgroundColor: colors.bgDeep, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: colors.onDark },
  backBtn: { paddingVertical: 16, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.glassBorder },
  backBtnText: { fontSize: 14, fontWeight: '600', color: colors.onDarkMuted },
  navRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },

  addItemForm: { gap: spacing.sm, backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md },
  addItemRow: { flexDirection: 'row', gap: spacing.sm },
  textInput: { backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 14, color: colors.onDark },
  addItemBtn: { backgroundColor: colors.bgDeep, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  addItemBtnText: { fontSize: 13, fontWeight: '700', color: colors.onDark },

  itemsList: { gap: spacing.sm },
  itemsTitle: { fontSize: 12, fontWeight: '700', color: colors.gold, marginBottom: 4 },
  bankItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.glassBorder, gap: spacing.sm },
  bankItemBody: { flex: 1 },
  bankItemDesc: { fontSize: 13, fontWeight: '600', color: colors.onDark },
  bankItemDate: { fontSize: 11, color: colors.onDarkMuted },
  bankItemAmount: { fontSize: 14, fontWeight: '700', color: colors.gold },
  removeText: { fontSize: 14, color: colors.onDarkMuted, padding: 4 },

  matchStats: { flexDirection: 'row', gap: spacing.md },
  matchStat: { flex: 1, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: 4 },
  matchStatNum: { fontSize: 28, fontWeight: '800' },
  matchStatLabel: { fontSize: 11, fontWeight: '600', color: colors.onDarkMuted },

  unmatchedTitle: { fontSize: 13, fontWeight: '700', color: colors.rust, marginTop: spacing.sm },
  unmatchedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.rustSoft, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.rustBorder, gap: spacing.sm },
  unmatchedBody: { flex: 1 },
  unmatchedDesc: { fontSize: 13, fontWeight: '600', color: colors.onDark },
  unmatchedDate: { fontSize: 11, color: colors.onDarkMuted },
  unmatchedRight: { alignItems: 'flex-end', gap: spacing.sm },
  unmatchedAmount: { fontSize: 14, fontWeight: '700', color: colors.rust },
  registerBtn: { backgroundColor: colors.rust, borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: 12 },
  registerBtnText: { fontSize: 11, fontWeight: '700', color: colors.onNavy },

  matchedTitle: { fontSize: 13, fontWeight: '700', color: colors.green, marginTop: spacing.md },

  allGoodCard: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  allGoodIcon: { fontSize: 48 },
  allGoodTitle: { fontSize: 18, fontWeight: '700', color: colors.gold },
  allGoodDesc: { fontSize: 13, color: colors.onDarkMuted, textAlign: 'center' },

  doneCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.xxl, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder, gap: spacing.md, ...shadow.hero },
  doneIcon: { fontSize: 56, marginBottom: spacing.sm },
  doneTitle: { fontSize: 22, fontWeight: '800', color: colors.gold },
  doneSubtitle: { fontSize: 14, color: colors.gold, fontWeight: '600' },
  doneBody: { fontSize: 14, color: colors.onDarkMuted, textAlign: 'center', lineHeight: 22 },
});
