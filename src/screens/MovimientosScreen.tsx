import React, { useState } from 'react';
import { amountToBase, formatCurrency } from '../lib/currency';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthProvider';
import { useAccounts } from '../hooks/useAccounts';
import { useBudgets } from '../hooks/useBudgets';
import { incomeSourceLabel, refFromDb, refOf, refKey } from '../lib/money';
import { useMonthlyTransactions } from '../hooks/useMonthlyTransactions';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, shadow, fonts, glass } from '../theme';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { getAttachmentUrl } from '../lib/attachments';
import { useLedger } from '../hooks/useLedger';
import { toLedgerItems, type LedgerItemData } from '../lib/ledger';
import { LedgerItem } from '../components/LedgerItem';
import { currentMonthRange } from '../utils/date';
import type { TransactionKind, TransactionRow } from '../types/db';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type Filter = 'todos' | TransactionKind | 'otros';

type Entry =
  | { kind: 'tx'; t: TransactionRow; date: string; created: string }
  | { kind: 'ledger'; item: LedgerItemData; date: string; created: string };

function fmt(n: number) {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const TX_CATEGORY_ICONS: Record<string, string> = {
  alimentacion: '🛒',
  transporte: '🚗',
  salud: '💊',
  educacion: '📚',
  entretenimiento: '🎬',
  servicios: '⚡',
  ropa: '👕',
  hogar: '🏠',
  viajes: '✈️',
  restaurantes: '🍽️',
};

function txIcon(kind: string, category?: string | null) {
  if (kind === 'ingreso') return '💰';
  return (category && TX_CATEGORY_ICONS[category]) ?? '💸';
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'gasto', label: 'Gastos' },
  { key: 'ingreso', label: 'Ingresos' },
  { key: 'otros', label: 'Otros' },
];

export function MovimientosScreen() {
  const navigation = useNavigation<NavProp>();
  const { householdId } = useAuth();
  const {
    transactions,
    totalGastos,
    totalIngresos,
    balance,
    monthLabel,
    loading,
    deleteTransaction,
    reload,
  } = useMonthlyTransactions(householdId);

  const { accounts: balances, reload: reloadAccounts } = useAccounts(householdId);
  const { budgets } = useBudgets(householdId);

  const [filter, setFilter] = useState<Filter>('todos');

  // De qué cuenta (o presupuesto) salió o entró cada movimiento.
  function whereText(t: (typeof transactions)[number]): string | null {
    if (t.budget_id) {
      const b = budgets.find((x) => x.id === t.budget_id);
      return b ? `Presupuesto ${b.nombre}` : 'Presupuesto';
    }
    const ref = refFromDb(t.medio, t.bank_account_id, t.moneda);
    if (!ref) return t.medio;
    return balances.find((a) => refKey(refOf(a)) === refKey(ref))?.nombre ?? (ref.kind === 'efectivo' ? 'Efectivo' : 'Cuenta');
  }

  // Metas, deudas, inversiones, presupuestos y transferencias también mueven dinero:
  // se muestran junto a los gastos e ingresos, cada uno con la cuenta que afectó.
  const { start, end } = currentMonthRange();
  const { rows: ledgerRows, reload: reloadLedger } = useLedger(householdId, { from: start, to: end });
  // Resumen del mes con TODO el dinero que entró y salió de tus cuentas (las transferencias entre
  // cuentas no cuentan: el dinero solo cambia de lugar).
  const flow = ledgerRows.filter((r) => !r.source.startsWith('transferencia'));
  const flowIn = flow.filter((r) => r.amount > 0).reduce((s, r) => s + amountToBase(r), 0);
  const flowOut = flow.filter((r) => r.amount < 0).reduce((s, r) => s - amountToBase(r), 0);
  const flowBalance = flowIn - flowOut;
  const otherItems = toLedgerItems(
    ledgerRows.filter((r) => r.source !== 'ingreso' && r.source !== 'gasto'),
    balances,
  );

  const entries: Entry[] = [
    ...(filter === 'otros'
      ? []
      : transactions
          .filter((t) => filter === 'todos' || t.kind === filter)
          .map((t): Entry => ({ kind: 'tx', t, date: t.occurred_on, created: t.created_at }))),
    ...(filter === 'todos' || filter === 'otros'
      ? otherItems.map((item): Entry => ({ kind: 'ledger', item, date: item.occurred_on, created: item.created_at }))
      : []),
  ].sort((a, b) => (a.date === b.date ? b.created.localeCompare(a.created) : b.date.localeCompare(a.date)));

  async function openAttachment(path: string) {
    const url = await getAttachmentUrl(path);
    if (!url) {
      Alert.alert('No se pudo abrir el archivo', 'Inténtalo de nuevo en unos segundos.');
      return;
    }
    Linking.openURL(url);
  }

  function confirmDelete(id: string, desc: string) {
    Alert.alert(
      'Eliminar movimiento',
      `¿Eliminar "${desc}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteTransaction(id);
            if (error) {
              Alert.alert('No se pudo eliminar', error);
              return;
            }
            reload();
            reloadLedger();
            reloadAccounts();
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[colors.bgDeep, colors.bg]} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
      {/* ── Summary bar ── */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryDot} accessibilityLabel="Ingresos">▲</Text>
          <View>
            <Text style={styles.summaryLabel}>Entradas</Text>
            <Text style={[styles.summaryValue, { color: colors.green }]}>¤{fmt(flowIn)}</Text>
          </View>
        </View>
        <View style={styles.summarySep} />
        <View style={styles.summaryItemCenter}>
          <Text style={styles.summaryMonth}>{monthLabel}</Text>
          <Text style={[styles.summaryBalance, { color: flowBalance >= 0 ? colors.green : colors.rust }]}>
            {flowBalance >= 0 ? '+' : '−'}¤{fmt(Math.abs(flowBalance))}
          </Text>
          <Text style={styles.summaryBalanceLabel}>cambio del mes</Text>
        </View>
        <View style={styles.summarySep} />
        <View style={[styles.summaryItem, { alignItems: 'flex-end' }]}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.summaryLabel}>Salidas</Text>
            <Text style={[styles.summaryValue, { color: colors.rust }]}>¤{fmt(flowOut)}</Text>
          </View>
          <Text style={styles.summaryDotRed}>▼</Text>
        </View>
      </View>

      {/* ── Filter tabs ── */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterLabel, filter === f.key && styles.filterLabelActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── List ── */}
      {loading ? (
        <ActivityIndicator color={colors.neonCyan} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {entries.length > 0 && (
            <Text style={styles.deleteHint}>Toca Editar para corregir un movimiento; mantén presionado para eliminarlo</Text>
          )}
          {entries.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyTitle}>Sin movimientos</Text>
              <Text style={styles.emptyDesc}>
                {filter === 'todos'
                  ? 'Registra tu primer movimiento este mes'
                  : `No hay ${filter === 'gasto' ? 'gastos' : filter === 'ingreso' ? 'ingresos' : 'otros movimientos'} este mes`}
              </Text>
            </View>
          ) : (
            entries.map((entry) => {
              if (entry.kind === 'ledger') return <LedgerItem key={entry.item.key} item={entry.item} />;
              const t = entry.t;
              return (
              <Pressable
                key={t.id}
                style={({ pressed }) => [styles.txCard, pressed && styles.txCardPressed]}
                onLongPress={() => confirmDelete(t.id, t.descripcion)}
              >
                        <View
                  style={[
                    styles.txIconBox,
                    t.kind === 'gasto' ? glass.amber : glass.cyan,
                  ]}
                >
                  <Text style={styles.txEmoji}>{txIcon(t.kind, t.category_id)}</Text>
                </View>

                <View style={styles.txBody}>
                  <Text style={styles.txDesc} numberOfLines={1}>{t.descripcion}</Text>
                  <View style={styles.txMetaRow}>
                    <Text style={styles.txMeta}>{t.occurred_on}</Text>
                    {whereText(t) && (
                      <>
                        <Text style={styles.txMetaDot}>·</Text>
                        <Text style={styles.txMeta}>{whereText(t)}</Text>
                      </>
                    )}
                    {t.kind === 'ingreso' && incomeSourceLabel(t.income_source) && (
                      <>
                        <Text style={styles.txMetaDot}>·</Text>
                        <Text style={styles.txMeta}>{incomeSourceLabel(t.income_source)}</Text>
                      </>
                    )}
                    {t.category_id && (
                      <>
                        <Text style={styles.txMetaDot}>·</Text>
                        <Text style={styles.txMeta}>{t.category_id}</Text>
                      </>
                    )}
                  </View>
                  {(t.receipt_path || t.voice_path) && (
                    <View style={styles.txMetaRow}>
                      {t.receipt_path && (
                        <Pressable onPress={() => openAttachment(t.receipt_path!)} hitSlop={6}>
                          <Text style={styles.attachLink}>📎 Recibo</Text>
                        </Pressable>
                      )}
                      {t.voice_path && (
                        <Pressable onPress={() => openAttachment(t.voice_path!)} hitSlop={6}>
                          <Text style={styles.attachLink}>🎙️ Nota de voz</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>

                <View style={styles.txRight}>
                  <Text style={[styles.txAmt, { color: t.kind === 'gasto' ? colors.rust : colors.green }]}>
                    {t.kind === 'gasto' ? '−' : '+'}{formatCurrency(Number(t.monto), t.moneda)}
                  </Text>
                  <Pressable
                    onPress={() => navigation.navigate('AddTransaction', { transactionId: t.id })}
                    accessibilityLabel={`Editar ${t.descripcion}`}
                    hitSlop={8}
                  >
                    <Text style={styles.editLink}>Editar</Text>
                  </Pressable>
                  <View
                    style={[
                      styles.txKindBadge,
                      { backgroundColor: t.kind === 'gasto' ? colors.neonAmberSoft : colors.neonCyanSoft },
                    ]}
                  >
                    <Text
                      style={[
                        styles.txKindText,
                        { color: t.kind === 'gasto' ? colors.rust : colors.green },
                      ]}
                    >
                      {t.kind === 'gasto' ? 'GASTO' : 'INGRESO'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
            })
          )}
          <View style={{ height: 130 }} />
        </ScrollView>
      )}

      {/* ── FAB ── */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.90 }] }]}
        onPress={() => navigation.navigate('AddTransaction', { defaultKind: 'gasto' })}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  editLink: { fontSize: 12, fontWeight: '700', color: colors.gold, marginBottom: 4 },
  deleteHint: { fontSize: 11, color: colors.onDarkMuted, textAlign: 'center', marginBottom: spacing.sm },
  attachLink: { fontSize: 12, fontWeight: '600', color: colors.navy, marginTop: 2, marginRight: spacing.md },
  safe: { flex: 1, backgroundColor: colors.bg },

  // Summary
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    ...glass.elevated,
    borderRadius: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  summaryItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summaryItemCenter: { flex: 1, alignItems: 'center' },
  summaryDot: { fontSize: 11, color: colors.neonCyan },
  summaryDotRed: { fontSize: 11, color: colors.neonAmber },
  summaryLabel: { fontSize: 10, color: colors.onDarkSubtle, fontWeight: '600', letterSpacing: 0.3 },
  summaryValue: { fontSize: 14, fontWeight: '800' },
  summarySep: { width: 1, height: 32, backgroundColor: colors.glassBorder },
  summaryMonth: { fontSize: 10, color: colors.onDarkSubtle, fontWeight: '600', marginBottom: 2 },
  summaryBalance: { fontSize: 18, fontWeight: '900', fontFamily: fonts.heading, letterSpacing: -0.5 },
  summaryBalanceLabel: { fontSize: 9, color: colors.onDarkSubtle, fontWeight: '600', letterSpacing: 0.5 },

  // Filter tabs
  filterRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  filterTab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  filterTabActive: { borderBottomColor: colors.neonCyan },
  filterLabel: { fontSize: 13, fontWeight: '600', color: colors.onDarkSubtle },
  filterLabelActive: { color: colors.neonCyan, fontWeight: '700' },

  // List
  scroll: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 130 },

  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    ...glass.base,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  txCardPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  txIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txEmoji: { fontSize: 22 },
  txBody: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: '600', color: colors.onDark, marginBottom: 3 },
  txMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  txMeta: { fontSize: 11, color: colors.onDarkSubtle },
  txMetaDot: { fontSize: 11, color: colors.onDarkSubtle },
  txRight: { alignItems: 'flex-end', gap: 5 },
  txAmt: { fontSize: 15, fontWeight: '800' },
  txKindBadge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  txKindText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },

  // Empty
  emptyCard: {
    ...glass.base,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.onDark },
  emptyDesc: { fontSize: 13, color: colors.onDarkMuted, textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: colors.gold,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.gold,
  },
  fabText: { color: '#1a0a00', fontSize: 30, lineHeight: 34, fontWeight: '300' },
});
