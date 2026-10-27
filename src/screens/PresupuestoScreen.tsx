import React, { useMemo, useState } from 'react';
import { amountToBase } from '../lib/currency';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthProvider';
import { useMonthlyTransactions } from '../hooks/useMonthlyTransactions';
import { useCategories } from '../hooks/useCategories';
import { useCategoryBudgets } from '../hooks/useCategoryBudgets';
import { useAccounts } from '../hooks/useAccounts';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useBankAccounts } from '../hooks/useBankAccounts';
import { budgetStatus, useBudgets, type BudgetSummary } from '../hooks/useBudgets';
import { Glass } from '../components/brand/Glass';
import { GoldButton } from '../components/brand/Buttons';
import { Icon } from '../components/brand/Icon';
import { BudgetForm } from '../components/budget/BudgetForm';
import { BudgetDetail } from '../components/budget/BudgetDetail';
import { MovementSheet, type MoveTipo } from '../components/budget/MovementSheet';
import { Chip, MEDIO_ICON, Sheet, FieldLabel, accountLabel, fmt, money } from '../components/budget/ui';
import { colors, spacing, radius } from '../theme';

const CATEGORY_ICONS: Record<string, string> = {
  Alimentación: '🍔', Comida: '🍔',
  Transporte: '🚗',
  Vivienda: '🏠', Alquiler: '🏠',
  Salud: '🏥', Médico: '🏥',
  Entretenimiento: '🎮',
  Servicios: '💡',
  Educación: '📚',
  Ropa: '👕',
  Tecnología: '📱',
};

function barColor(status: 'ok' | 'warn' | 'over') {
  return status === 'over' ? colors.rust : status === 'warn' ? colors.neonAmber : colors.green;
}

export function PresupuestoScreen() {
  const { householdId } = useAuth();
  const { transactions, totalGastos, monthLabel, loading } = useMonthlyTransactions(householdId);
  const { categories } = useCategories();
  const { getLimit, setLimit, removeLimit, totalBudget, loading: limitsLoading } = useCategoryBudgets(householdId);
  const { accounts } = useBankAccounts(householdId);
  const { accounts: balances, find: findAccount, reload: reloadAccounts } = useAccounts(householdId);
  const { budgets, totals, loading: budgetsLoading, save, remove, moveMoney, removeMovement } = useBudgets(householdId);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Presupuestos: formulario, detalle y movimientos
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTipo, setMoveTipo] = useState<MoveTipo>('abono');
  const [moveFromCard, setMoveFromCard] = useState(false);

  // Límites por categoría
  const [limitOpen, setLimitOpen] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState('');
  const [savingLimit, setSavingLimit] = useState(false);

  const editing = budgets.find((b) => b.id === editingId) ?? null;
  const detail = budgets.find((b) => b.id === detailId) ?? null;
  const categoryLabel = (id: string | null) => (id ? categories.find((c) => c.id === id)?.label ?? null : null);

  const spendingByCat = useMemo(() => {
    const result: Record<string, number> = {};
    transactions
      .filter((t) => t.kind === 'gasto')
      .forEach((t) => {
        const key = t.category_id ?? '__sin_cat';
        result[key] = (result[key] ?? 0) + amountToBase(t);
      });
    return result;
  }, [transactions]);

  const limitRows = categories
    .map((cat) => ({ id: cat.id, label: cat.label, spent: spendingByCat[cat.id] ?? 0, limit: getLimit(cat.id) }))
    .filter((r) => r.spent > 0 || r.limit > 0);
  const sinCategoria = spendingByCat['__sin_cat'] ?? 0;

  const overallPct = totals.monto > 0 ? Math.round((totals.gastado / totals.monto) * 100) : 0;
  const overallStatus = budgetStatus({ gastado: totals.gastado, monto: totals.monto });

  function openNew() {
    setEditingId(null);
    setFormOpen(true);
  }

  function openMove(b: BudgetSummary, tipo: MoveTipo) {
    setDetailId(b.id);
    setMoveTipo(tipo);
    setMoveFromCard(true);
    setMoveOpen(true);
  }

  function openLimit(catId: string | null, current = 0) {
    setSelectedCatId(catId);
    setLimitInput(current > 0 ? String(current) : '');
    setLimitOpen(true);
  }

  async function handleSetLimit() {
    const val = parseFloat(limitInput.replace(/,/g, ''));
    if (!selectedCatId) return Alert.alert('Elige una categoría', 'Selecciona a qué categoría aplica el límite.');
    if (!val || val <= 0) return Alert.alert('Inválido', 'Ingresa un límite mayor a 0.');
    setSavingLimit(true);
    const { error } = await setLimit(selectedCatId, val);
    setSavingLimit(false);
    if (error) return Alert.alert('Error', error);
    setLimitOpen(false);
  }

  function handleRemoveLimit() {
    if (!selectedCatId) return;
    Alert.alert('Quitar límite', '¿Quitar el límite de esta categoría?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          await removeLimit(selectedCatId);
          setLimitOpen(false);
        },
      },
    ]);
  }

  const busy = loading || budgetsLoading || limitsLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[colors.bgDeep, colors.bg]} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Resumen del mes */}
        <Glass highlight>
          <Text style={styles.kicker}>PRESUPUESTO · {monthLabel.toUpperCase()}</Text>
          {budgets.length > 0 ? (
            <>
              <Text style={styles.heroAmount}>¤{fmt(totals.monto)}</Text>
              <View style={styles.heroTrack}>
                <View
                  style={[
                    styles.heroFill,
                    { width: `${Math.min(100, overallPct)}%`, backgroundColor: barColor(overallStatus) },
                  ]}
                />
              </View>
              <Text style={styles.heroNote}>
                Gastaste el {overallPct}% de lo planeado
                {overallStatus === 'over' ? ' · te pasaste de la meta' : ''}
              </Text>
              <View style={styles.heroStats}>
                <HeroStat label="Abonado" value={totals.abonado} />
                <View style={styles.sep} />
                <HeroStat label="Gastado" value={totals.gastado} />
                <View style={styles.sep} />
                <HeroStat
                  label="En presupuestos"
                  value={totals.disponible}
                  color={totals.disponible <= 0 ? colors.rust : colors.green}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.heroAmount}>¤{fmt(totalGastos)}</Text>
              <Text style={styles.heroNote}>Gastado este mes. Crea un presupuesto para ponerle meta y seguimiento.</Text>
            </>
          )}
        </Glass>

        {busy && budgets.length === 0 ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 32 }} />
        ) : (
          <>
            {/* Mis presupuestos */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>MIS PRESUPUESTOS</Text>
              {budgets.length > 0 && (
                <Pressable onPress={openNew} style={styles.addBtn} accessibilityLabel="Nuevo presupuesto">
                  <Icon name="plus" size={15} color={colors.onNavy} strokeWidth={2.6} />
                  <Text style={styles.addBtnText}>Nuevo</Text>
                </Pressable>
              )}
            </View>

            {budgets.length === 0 ? (
              <Glass>
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Icon name="wallet" size={30} color={colors.gold} />
                  </View>
                  <Text style={styles.emptyTitle}>Crea tu primer presupuesto</Text>
                  <Text style={styles.emptyDesc}>
                    Ponle nombre y meta, di en qué cuenta está el dinero y ve abonando mientras gastas. Todo queda con seguimiento.
                  </Text>
                  <GoldButton label="Crear presupuesto" onPress={openNew} style={{ alignSelf: 'stretch' }} />
                </View>
              </Glass>
            ) : (
              budgets.map((b) => {
                const status = budgetStatus(b);
                return (
                  <Glass key={b.id} warn={status === 'over'} style={{ marginBottom: spacing.md }}>
                    <Pressable onPress={() => setDetailId(b.id)} accessibilityLabel={`Ver ${b.nombre}`}>
                      <View style={styles.cardHead}>
                        <View style={styles.cardIcon}>
                          <Icon name={MEDIO_ICON[b.medio]} size={20} color={colors.gold} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardName} numberOfLines={1}>{b.nombre}</Text>
                          <Text style={styles.cardSub} numberOfLines={1}>
                            {accountLabel(b, accounts)}
                            {categoryLabel(b.category_id) ? ` · ${categoryLabel(b.category_id)}` : ''}
                          </Text>
                        </View>
                        <Text style={[styles.cardPct, { color: barColor(status) }]}>{b.pctGastado}%</Text>
                      </View>

                      <View style={styles.track}>
                        <View style={[styles.fillAbonado, { width: `${b.pctAbonado}%` }]} />
                        <View
                          style={[
                            styles.fillGastado,
                            { width: `${Math.min(100, b.pctGastado)}%`, backgroundColor: barColor(status) },
                          ]}
                        />
                      </View>

                      <View style={styles.numbers}>
                        <Num label="Meta" value={b.monto} />
                        <Num label="Abonado" value={b.abonado} />
                        <Num label="Gastado" value={b.gastado} />
                        <Num label="Hay" value={b.disponible} color={b.disponible < 0 ? colors.rust : colors.green} />
                      </View>
                      {status === 'over' && (
                        <Text style={styles.overMsg}>Te pasaste por ¤{fmt(b.gastado - b.monto)}</Text>
                      )}
                    </Pressable>

                    <View style={styles.cardActions}>
                      <Pressable style={[styles.actionBtn, styles.actionPrimary]} onPress={() => openMove(b, 'abono')}>
                        <Icon name="plus" size={15} color={colors.onNavy} strokeWidth={2.6} />
                        <Text style={styles.actionPrimaryText}>Abonar</Text>
                      </Pressable>
                      <Pressable style={styles.actionBtn} onPress={() => navigation.navigate('AddTransaction', { defaultKind: 'gasto', budgetId: b.id })}>
                        <Icon name="down" size={15} color={colors.goldBright} />
                        <Text style={styles.actionText}>Gasto</Text>
                      </Pressable>
                      <Pressable
                        style={styles.actionBtn}
                        onPress={() => {
                          setEditingId(b.id);
                          setFormOpen(true);
                        }}
                      >
                        <Icon name="edit" size={15} color={colors.goldBright} />
                        <Text style={styles.actionText}>Editar</Text>
                      </Pressable>
                    </View>
                  </Glass>
                );
              })
            )}

            {/* Límites por categoría */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>LÍMITES POR CATEGORÍA</Text>
              <Pressable onPress={() => openLimit(null)} style={styles.linkBtn} accessibilityLabel="Fijar un límite">
                <Icon name="plus" size={14} color={colors.gold} strokeWidth={2.4} />
                <Text style={styles.linkText}>Límite</Text>
              </Pressable>
            </View>

            {limitRows.length === 0 && sinCategoria === 0 ? (
              <Text style={styles.limitEmpty}>
                Fija un tope por categoría (por ejemplo, Comida) y recibe la alerta cuando lo superes.
              </Text>
            ) : (
              <>
                {limitRows.map((row) => {
                  const pct = row.limit > 0 ? Math.min(Math.round((row.spent / row.limit) * 100), 100) : 0;
                  const over = row.limit > 0 && row.spent > row.limit;
                  const color = over ? colors.rust : row.limit > 0 && row.spent > row.limit * 0.8 ? colors.neonAmber : colors.green;
                  return (
                    <Pressable
                      key={row.id}
                      style={styles.catCard}
                      onPress={() => openLimit(row.id, row.limit)}
                      accessibilityLabel={`Límite de ${row.label}`}
                    >
                      <View style={styles.catHeader}>
                        <View style={styles.catLeft}>
                          <Text style={styles.catIcon}>{CATEGORY_ICONS[row.label] ?? '📌'}</Text>
                          <View>
                            <Text style={styles.catName}>{row.label}</Text>
                            <Text style={styles.catSub}>
                              ¤{fmt(row.spent)}{row.limit > 0 ? ` / ¤${fmt(row.limit)}` : ''}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.catPct, { color: row.limit > 0 ? color : colors.gold }]}>
                          {row.limit > 0 ? `${pct}%` : 'Fijar'}
                        </Text>
                      </View>
                      {row.limit > 0 && (
                        <View style={styles.catTrack}>
                          <View style={[styles.catFill, { width: `${pct}%`, backgroundColor: color }]} />
                        </View>
                      )}
                      {over && <Text style={styles.overMsg}>Excediste por ¤{fmt(row.spent - row.limit)}</Text>}
                    </Pressable>
                  );
                })}
                {sinCategoria > 0 && (
                  <View style={styles.catCard}>
                    <View style={styles.catLeft}>
                      <Text style={styles.catIcon}>📌</Text>
                      <View>
                        <Text style={styles.catName}>Sin categoría</Text>
                        <Text style={styles.catSub}>¤{fmt(sinCategoria)}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </>
            )}
            {totalBudget > 0 && (
              <Text style={styles.limitTotal}>Suma de límites por categoría: ¤{fmt(totalBudget)}</Text>
            )}

            <Glass style={{ marginTop: spacing.lg }}>
              <Text style={styles.tipTitle}>Tip del Rey Salomón</Text>
              <Text style={styles.tipBody}>
                Abona a tu presupuesto apenas cobres: separar el dinero primero y gastar después es la forma más sencilla de no pasarte.
              </Text>
            </Glass>
          </>
        )}
      </ScrollView>

      <BudgetForm
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        budget={editing}
        categories={categories}
        accounts={accounts}
        onSave={save}
        onDelete={async (id) => {
          const res = await remove(id);
          if (!res.error) {
            setDetailId(null);
            await reloadAccounts();
          }
          return res;
        }}
      />

      <BudgetDetail
        visible={!!detail && !formOpen && !moveOpen}
        onClose={() => setDetailId(null)}
        budget={detail}
        accounts={accounts}
        categoryLabel={categoryLabel}
        onMove={(tipo) => {
          setMoveTipo(tipo);
          setMoveFromCard(false);
          setMoveOpen(true);
        }}
        onSpend={() => {
          if (detail) navigation.navigate('AddTransaction', { defaultKind: 'gasto', budgetId: detail.id });
          setDetailId(null);
        }}
        onEdit={() => {
          setEditingId(detailId);
          setFormOpen(true);
        }}
        onRemoveMovement={async (id) => {
          const res = await removeMovement(id);
          if (!res.error) await reloadAccounts();
          return res;
        }}
      />

      <MovementSheet
        visible={moveOpen}
        onClose={() => {
          setMoveOpen(false);
          if (moveFromCard) setDetailId(null);
        }}
        budget={detail}
        initialTipo={moveTipo}
        accounts={balances}
        findAccount={findAccount}
        onSubmit={async (...args) => {
          const res = await moveMoney(...args);
          if (!res.error) await reloadAccounts();
          return res;
        }}
      />

      <Sheet visible={limitOpen} onClose={() => setLimitOpen(false)} title="Límite mensual">
        <FieldLabel>Categoría</FieldLabel>
        <View style={styles.chipWrap}>
          {categories.map((c) => (
            <Chip key={c.id} label={c.label} active={selectedCatId === c.id} onPress={() => { setSelectedCatId(c.id); setLimitInput(getLimit(c.id) > 0 ? String(getLimit(c.id)) : ''); }} />
          ))}
        </View>
        <FieldLabel>Límite (¤)</FieldLabel>
        <TextInput
          style={styles.modalInput}
          value={limitInput}
          onChangeText={setLimitInput}
          placeholder="0.00"
          placeholderTextColor={colors.onDarkMuted}
          keyboardType="decimal-pad"
        />
        <GoldButton label="Guardar límite" onPress={handleSetLimit} loading={savingLimit} />
        {selectedCatId && getLimit(selectedCatId) > 0 && (
          <Pressable onPress={handleRemoveLimit} style={styles.removeLimit}>
            <Text style={styles.removeLimitText}>Quitar límite</Text>
          </Pressable>
        )}
      </Sheet>
    </SafeAreaView>
  );
}

function HeroStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatLabel}>{label}</Text>
      <Text style={[styles.heroStatValue, color ? { color } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {money(value)}
      </Text>
    </View>
  );
}

function Num({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.num}>
      <Text style={styles.numLabel}>{label}</Text>
      <Text style={[styles.numValue, color ? { color } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {fmt(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 130, maxWidth: 640, width: '100%', alignSelf: 'center' },

  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: colors.onDarkMuted },
  heroAmount: { fontSize: 32, fontWeight: '800', color: colors.goldBright, marginTop: 6 },
  heroTrack: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden', marginTop: spacing.md },
  heroFill: { height: '100%', borderRadius: 5 },
  heroNote: { fontSize: 12, color: colors.onDarkMuted, marginTop: spacing.sm, lineHeight: 17 },
  heroStats: { flexDirection: 'row', marginTop: spacing.lg },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatLabel: { fontSize: 10, fontWeight: '600', color: colors.onDarkMuted, marginBottom: 4 },
  heroStatValue: { fontSize: 14, fontWeight: '700', color: colors.onDark },
  sep: { width: 1, backgroundColor: colors.line },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.gold,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill,
  },
  addBtnText: { fontSize: 13, fontWeight: '800', color: colors.onNavy },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  linkText: { fontSize: 13, fontWeight: '700', color: colors.gold },

  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.goldBorder,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.goldBright },
  emptyDesc: { fontSize: 13, color: colors.onDarkMuted, textAlign: 'center', lineHeight: 19 },

  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  cardIcon: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.goldBorder,
  },
  cardName: { fontSize: 16, fontWeight: '700', color: colors.onDark },
  cardSub: { fontSize: 12, color: colors.onDarkMuted, marginTop: 2 },
  cardPct: { fontSize: 18, fontWeight: '800' },

  track: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  fillAbonado: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(226,190,75,0.35)' },
  fillGastado: { position: 'absolute', left: 0, top: 2.5, bottom: 2.5, borderRadius: 3 },

  numbers: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  num: { flex: 1 },
  numLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6, color: colors.onDarkMuted, textTransform: 'uppercase' },
  numValue: { fontSize: 13, fontWeight: '700', color: colors.onDark, marginTop: 3 },
  overMsg: { fontSize: 12, fontWeight: '700', color: colors.rust, marginTop: spacing.sm },

  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(226,190,75,0.45)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  actionPrimary: { backgroundColor: colors.gold, borderColor: colors.gold },
  actionText: { fontSize: 13, fontWeight: '700', color: colors.goldBright },
  actionPrimaryText: { fontSize: 13, fontWeight: '800', color: colors.onNavy },

  limitEmpty: { fontSize: 13, color: colors.onDarkMuted, lineHeight: 19 },
  limitTotal: { fontSize: 12, color: colors.onDarkMuted, marginTop: spacing.sm },
  catCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  catIcon: { fontSize: 22 },
  catName: { fontSize: 14, fontWeight: '600', color: colors.onDark },
  catSub: { fontSize: 11, color: colors.onDarkMuted, marginTop: 2 },
  catPct: { fontSize: 14, fontWeight: '700' },
  catTrack: { height: 6, backgroundColor: colors.line, borderRadius: 3, overflow: 'hidden' },
  catFill: { height: '100%', borderRadius: 3 },

  tipTitle: { fontSize: 13, fontWeight: '700', color: colors.neonCyan, marginBottom: spacing.sm },
  tipBody: { fontSize: 13, color: colors.onDarkMuted, lineHeight: 19 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md, paddingVertical: 13, fontSize: 22, color: colors.goldBright, fontWeight: '700',
  },
  removeLimit: { alignItems: 'center', paddingVertical: spacing.sm },
  removeLimitText: { fontSize: 14, fontWeight: '700', color: colors.rust },
});
