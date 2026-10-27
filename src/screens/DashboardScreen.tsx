import React, { useMemo } from 'react';
import { useLedger } from '../hooks/useLedger';
import { currentMonthRange } from '../utils/date';
import { amountToBase, baseCurrency, formatCurrency, isCurrency } from '../lib/currency';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Text } from '../components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthProvider';
import { useMonthlyTransactions } from '../hooks/useMonthlyTransactions';
import { useDebts } from '../hooks/useDebts';
import { useGoals } from '../hooks/useGoals';
import { useScheduledExpenses } from '../hooks/useScheduledExpenses';
import { useFinancialScore } from '../hooks/useFinancialScore';
import { useBudgets, budgetStatus } from '../hooks/useBudgets';
import { daySummary } from '../lib/dailySummary';
import { useAccounts } from '../hooks/useAccounts';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { attentionItems } from '../lib/reminders';
import { useDebtSchedule } from '../hooks/useDebtSchedule';
import { debtAttention } from '../lib/debtDates';
import { TrialBanner } from '../components/TrialBanner';
import { SalomonEmblem } from '../components/brand/SalomonEmblem';
import { Icon, type IconName } from '../components/brand/Icon';
import { Glass } from '../components/brand/Glass';
import { Sparkline, ScoreGauge } from '../components/brand/Charts';
import { colors, spacing, radius, fonts } from '../theme';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function fmt(n: number) {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CATEGORY_ICONS: Record<string, IconName> = {
  alimentacion: 'cart',
  transporte: 'car',
  salud: 'shield',
  educacion: 'book',
  entretenimiento: 'ticket',
  servicios: 'fire',
  hogar: 'home',
  vivienda: 'home',
  suscripciones: 'refresh',
  deudas: 'card',
};

function txIcon(kind: string, category?: string | null): IconName {
  if (kind === 'ingreso') return 'briefcase';
  return (category && CATEGORY_ICONS[category]) || 'coin';
}

// Umbrales del Score (mismos que useFinancialScore).
const LEVELS: { min: number; grade: string }[] = [
  { min: 500, grade: 'C' },
  { min: 580, grade: 'C+' },
  { min: 670, grade: 'B' },
  { min: 740, grade: 'A' },
  { min: 800, grade: 'A+' },
];

function nextLevel(score: number): string {
  const next = LEVELS.find((l) => l.min > score);
  if (!next) return 'Nivel máximo alcanzado';
  const label = next.grade === 'C+' ? 'B' : next.grade;
  return `A ${next.min - score} puntos del nivel ${label}`;
}

export function DashboardScreen() {
  const navigation = useNavigation<NavProp>();
  const { width } = useWindowDimensions();
  const { householdId, user } = useAuth();
  const { transactions, totalGastos, totalIngresos, balance, monthLabel, loading } = useMonthlyTransactions(householdId);
  const { total: cuentasTotal } = useAccounts(householdId);
  // Todo el dinero que entró y salió de tus cuentas este mes (gastos, ingresos, deudas, metas, inversiones y presupuestos).
  const { start: mStart, end: mEnd } = currentMonthRange();
  const { rows: flowRows } = useLedger(householdId, { from: mStart, to: mEnd });
  const flow = flowRows.filter((r) => !r.source.startsWith('transferencia'));
  const flowIn = flow.filter((r) => r.amount > 0).reduce((sum, r) => sum + amountToBase(r), 0);
  const flowOut = flow.filter((r) => r.amount < 0).reduce((sum, r) => sum - amountToBase(r), 0);
  const debtOut = flow.filter((r) => r.source === 'deuda').reduce((sum, r) => sum - amountToBase(r), 0);
  const { events: agendaEvents } = useCalendarEvents(householdId);
  const { totalDeuda, totalCuotaMensual, totalsByCurrency } = useDebts(householdId);
  const { goals } = useGoals(householdId);
  const { budgets: budgetList, totals: budgetTotals } = useBudgets(householdId);
  const { totalPending: totalPagosP, pending: pagosPendientes } = useScheduledExpenses(householdId);
  const { items: debtItems, payments: debtPays } = useDebtSchedule(householdId);
  const attention = useMemo(
    () => [...attentionItems(agendaEvents, pagosPendientes), ...debtAttention(debtItems, debtPays)].sort((a, b) => a.date.localeCompare(b.date)),
    [agendaEvents, pagosPendientes, debtItems, debtPays],
  );
  const { total: fscore, label: fscoreLabel, grade, provisional: fProvisional, result: fResult } = useFinancialScore(householdId);

  const totalMetasTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
  const totalMetasActual = goals.reduce((s, g) => s + Number(g.current_amount), 0);
  const metasPct = totalMetasTarget > 0 ? Math.round((totalMetasActual / totalMetasTarget) * 100) : 0;

  const recent = transactions.slice(0, 4);

  // Presupuestos del mes: los más gastados primero, para ver de un vistazo cuál se acerca al límite
  const topBudgets = useMemo(() => [...budgetList].sort((a, b) => b.pctGastado - a.pctGastado).slice(0, 4), [budgetList]);

  // Resumen del día: cómo vas hoy y en el mes, y qué viene mañana
  const summary = useMemo(
    () =>
      daySummary({
        now: new Date(),
        transactions: transactions.map((t) => ({ kind: t.kind, amount: amountToBase(t), occurred_on: t.occurred_on })),
        budgets: budgetList.map((b) => ({ nombre: b.nombre, monto: b.monto, gastado: b.gastado })),
        upcoming: attention.map((a) => ({ title: a.title, date: a.date, overdue: a.overdue, amount: a.amount })),
      }),
    [transactions, budgetList, attention],
  );
  const summaryColor = summary.tone === 'warn' ? colors.neonAmber : summary.tone === 'nudge' ? colors.gold : colors.green;
  const usePct = totalIngresos > 0 ? Math.min(Math.round((totalGastos / totalIngresos) * 100), 100) : 0;

  const displayName = (user as any)?.user_metadata?.display_name ?? 'Usuario';
  const firstName = String(displayName).split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  // Balance acumulado día a día del mes en curso (para la línea de tendencia).
  const series = useMemo(() => {
    const today = new Date().getDate();
    const perDay = new Array(today).fill(0);
    for (const t of transactions) {
      const day = Number(t.occurred_on.slice(8, 10));
      if (day >= 1 && day <= today) perDay[day - 1] += (t.kind === 'ingreso' ? 1 : -1) * amountToBase(t);
    }
    let acc = 0;
    return perDay.map((v) => (acc += v));
  }, [transactions]);

  const sparkW = Math.min(width, 600) - 84;
  const positive = balance >= 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[colors.bgDeep, colors.bg, '#041F0F']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => navigation.navigate('Preferencias')} style={styles.avatar} accessibilityRole="button" accessibilityLabel="Preferencias">
              <SalomonEmblem size={19} ring={false} />
            </Pressable>
            <View>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.userName}>{firstName}</Text>
            </View>
          </View>
          <View style={styles.periodPill}>
            <Text style={styles.periodText}>{monthLabel}</Text>
          </View>
        </View>

        <TrialBanner />

        <Glass radius={28} padding={20} highlight>
          <Text style={styles.heroLabel}>Balance del mes</Text>
          {loading ? (
            <ActivityIndicator color={colors.gold} style={{ marginVertical: 14 }} />
          ) : (
            <>
              <Text style={[styles.heroValue, { color: positive ? colors.goldBright : colors.neonAmber }]}>
                {positive ? '+' : '−'}¤{fmt(Math.abs(balance))}
              </Text>
              <View style={[styles.chip, { backgroundColor: positive ? colors.greenSoft : colors.neonAmberSoft }]}>
                <Icon name={positive ? 'up' : 'alert'} size={14} color={positive ? colors.green : colors.neonAmber} strokeWidth={2.4} />
                <Text style={[styles.chipText, { color: positive ? colors.green : colors.neonAmber }]}>
                  {positive ? 'Superávit mensual' : 'Déficit mensual'}
                </Text>
              </View>
            </>
          )}
          <View style={{ marginTop: 14, marginLeft: -2 }}>
            <Sparkline values={series} width={sparkW} height={56} />
          </View>
          <View style={styles.heroFoot}>
            <Text style={styles.heroFootText}>Uso del ingreso: {usePct}%</Text>
            <Text style={styles.heroFootText}>¤{fmt(totalGastos)} de ¤{fmt(totalIngresos)}</Text>
          </View>
        </Glass>

        <Pressable
          onPress={() => navigation.navigate('Cartera')}
          accessibilityLabel="Ver tus cuentas"
          style={styles.accountsPill}
        >
          <Icon name="wallet" size={18} color={colors.gold} />
          <Text style={styles.accountsText}>Dinero en tus cuentas</Text>
          <Text style={[styles.accountsValue, cuentasTotal < 0 && { color: colors.rust }]}>¤{fmt(cuentasTotal)}</Text>
          <Icon name="chevron" size={16} color={colors.onDarkMuted} />
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Movimientos')} accessibilityLabel="Ver el flujo de dinero del mes" style={styles.flowRow}>
          <Text style={styles.flowText}>Flujo del mes</Text>
          <Text style={[styles.flowText, { color: colors.green }]}>+¤{fmt(flowIn)}</Text>
          <Text style={[styles.flowText, { color: colors.rust }]}>−¤{fmt(flowOut)}</Text>
          {debtOut > 0 && <Text style={styles.flowText}>Deudas ¤{fmt(debtOut)}</Text>}
        </Pressable>

        {attention.length > 0 && (
          <Glass radius={22} padding={14} warn={attention.some((a) => a.overdue)}>
            <View style={styles.attHead}>
              <Icon name="bell" size={18} color={colors.gold} />
              <Text style={styles.attTitle}>Pendientes</Text>
              <Pressable onPress={() => navigation.navigate('Agenda')} hitSlop={8} accessibilityLabel="Abrir la agenda">
                <Text style={styles.attLink}>Ver agenda</Text>
              </Pressable>
            </View>
            {attention.slice(0, 4).map((a) => (
              <Pressable
                key={`${a.kind}-${a.id}`}
                onPress={() => (a.kind === 'pago' ? navigation.navigate('GastosProgramados', { payId: a.id }) : a.kind === 'deuda' ? navigation.navigate('Deudas') : navigation.navigate('Agenda'))}
                style={styles.attRow}
                accessibilityLabel={`${a.title}, ${a.subtitle}`}
              >
                <Icon name={a.kind === 'evento' ? 'calendar' : 'card'} size={16} color={a.overdue ? colors.rust : colors.goldBright} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.attName} numberOfLines={1}>{a.title}</Text>
                  <Text style={[styles.attSub, a.overdue && { color: colors.rust, fontWeight: '700' }]}>{a.subtitle}</Text>
                </View>
                {a.amount !== undefined && <Text style={styles.attAmt}>{formatCurrency(a.amount, isCurrency(a.moneda) ? a.moneda : baseCurrency())}</Text>}
              </Pressable>
            ))}
            {attention.length > 4 && <Text style={styles.attMore}>y {attention.length - 4} más…</Text>}
          </Glass>
        )}

        <View style={styles.pair}>
          <Glass radius={22} padding={14} style={{ flex: 1 }}>
            <View style={styles.pairHead}>
              <Icon name="down" size={18} color={colors.green} strokeWidth={2.2} />
              <Text style={styles.pairLabel}>Ingresos</Text>
            </View>
            <Text style={styles.pairValue}>¤{fmt(totalIngresos)}</Text>
          </Glass>
          <Glass radius={22} padding={14} style={{ flex: 1 }}>
            <View style={styles.pairHead}>
              <Icon name="up" size={18} color={colors.rust} strokeWidth={2.2} />
              <Text style={styles.pairLabel}>Gastos</Text>
            </View>
            <Text style={styles.pairValue}>¤{fmt(totalGastos)}</Text>
          </Glass>
        </View>

        <Pressable onPress={() => navigation.navigate('Score')} accessibilityRole="button" accessibilityLabel="Ver mi score financiero">
          <Glass radius={24} padding={14} innerStyle={styles.scoreInner}>
            <ScoreGauge score={fscore} size={100} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.scoreTitle}>SCORE SALOMÓN</Text>
              <Text style={styles.scoreGrade}>
                {fscoreLabel} · {grade}
              </Text>
              <Text style={styles.scoreNext}>{fProvisional ? fResult?.missing[0] ?? 'Puntaje provisional' : nextLevel(fscore)}</Text>
            </View>
            <Icon name="chevron" size={20} color={colors.onDarkSubtle} />
          </Glass>
        </Pressable>

        <View style={styles.actions}>
          {(
            [
              { label: 'Gasto', icon: 'up', go: () => navigation.navigate('AddTransaction', { defaultKind: 'gasto' }) },
              { label: 'Ingreso', icon: 'down', go: () => navigation.navigate('AddTransaction', { defaultKind: 'ingreso' }) },
              { label: 'Metas', icon: 'target', go: () => navigation.navigate('Metas') },
              { label: 'Cartera', icon: 'wallet', go: () => navigation.navigate('Cartera') },
            ] as { label: string; icon: IconName; go: () => void }[]
          ).map((a) => (
            <Pressable key={a.label} style={styles.action} onPress={a.go} accessibilityRole="button" accessibilityLabel={a.label}>
              <View style={styles.actionIcon}>
                <Icon name={a.icon} size={24} color={colors.gold} strokeWidth={2} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <Glass radius={24} padding={16} innerStyle={{ gap: 8 }}>
          <Text style={[styles.daySummaryTitle, { color: summaryColor }]}>{summary.title}</Text>
          {summary.lines.map((line, i) => (
            <Text key={i} style={styles.daySummaryLine}>• {line}</Text>
          ))}
          <Text style={styles.daySummaryClosing}>{summary.closing}</Text>
          {summary.tone === 'nudge' && (
            <Pressable style={styles.daySummaryBtn} onPress={() => navigation.navigate('AddTransaction', { defaultKind: 'gasto' })} accessibilityRole="button">
              <Text style={styles.daySummaryBtnText}>Registrar un gasto</Text>
            </Pressable>
          )}
        </Glass>

        <View style={styles.pair}>
          <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('Presupuesto')} accessibilityRole="button">
            <Glass radius={22} padding={14}>
              <Icon name="pie" size={22} color={colors.gold} />
              <Text style={styles.tileTitle}>Presupuesto{budgetList.length ? ` · ${budgetList.length}` : ''}</Text>
              <Text style={styles.tileSub}>
                {budgetList.length ? `¤${fmt(budgetTotals.gastado)} de ¤${fmt(budgetTotals.monto)} gastado` : 'Crea tu primer presupuesto'}
              </Text>
            </Glass>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('Metas')} accessibilityRole="button">
            <Glass radius={22} padding={14}>
              <Icon name="target" size={22} color={colors.gold} />
              <Text style={styles.tileTitle}>Metas · {metasPct}%</Text>
              <Text style={styles.tileSub}>¤{fmt(totalMetasActual)} ahorrados</Text>
            </Glass>
          </Pressable>
        </View>
        <View style={styles.pair}>
          <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('Deudas')} accessibilityRole="button">
            <Glass radius={22} padding={14}>
              <Icon name="card" size={22} color={colors.gold} />
              <Text style={styles.tileTitle}>¤{fmt(totalDeuda)}</Text>
              <Text style={styles.tileSub}>
                {totalsByCurrency.length > 1 ? (
                  totalsByCurrency.map((x) => formatCurrency(x.saldo, x.moneda)).join(' + ')
                ) : (
                  `Deudas · ¤${fmt(totalCuotaMensual)}/mes`
                )}
              </Text>
            </Glass>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('GastosProgramados')} accessibilityRole="button">
            <Glass radius={22} padding={14}>
              <Icon name="calendar" size={22} color={colors.gold} />
              <Text style={styles.tileTitle}>¤{fmt(totalPagosP)}</Text>
              <Text style={styles.tileSub}>Pendientes este mes</Text>
            </Glass>
          </Pressable>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Presupuestos del mes</Text>
          <Pressable onPress={() => navigation.navigate('Presupuesto')} hitSlop={8} accessibilityRole="button">
            <Text style={styles.seeAll}>{budgetList.length ? 'Ver todos' : 'Crear'}</Text>
          </Pressable>
        </View>
        {budgetList.length === 0 ? (
          <Pressable onPress={() => navigation.navigate('Presupuesto')} accessibilityRole="button">
            <Glass radius={22} padding={18} innerStyle={{ alignItems: 'center', gap: 6 }}>
              <Icon name="pie" size={30} color={colors.gold} strokeWidth={1.6} />
              <Text style={styles.emptyTitle}>Aún no tienes presupuestos</Text>
              <Text style={styles.emptyDesc}>Crea uno y elige de qué cuenta saldrá el dinero</Text>
            </Glass>
          </Pressable>
        ) : (
          <Glass radius={22} padding={0}>
            {topBudgets.map((b, i) => {
              const st = budgetStatus(b);
              const bar = st === 'over' ? colors.rust : st === 'warn' ? colors.neonAmber : colors.green;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => navigation.navigate('Presupuesto')}
                  accessibilityRole="button"
                  accessibilityLabel={`Presupuesto ${b.nombre}`}
                  style={[styles.budgetRow, i < topBudgets.length - 1 && styles.txDivider]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.budgetHead}>
                      <Text style={styles.txDesc}>{b.nombre}</Text>
                      <Text style={styles.txMeta}>¤{fmt(b.gastado)} / ¤{fmt(b.monto)}</Text>
                    </View>
                    <View style={styles.budgetTrack}>
                      <View style={[styles.budgetFill, { width: `${Math.min(100, b.pctGastado)}%`, backgroundColor: bar }]} />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </Glass>
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Últimos movimientos</Text>
          <Pressable onPress={() => navigation.navigate('Movimientos')} hitSlop={8}>
            <Text style={styles.seeAll}>Ver todos</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} />
        ) : recent.length === 0 ? (
          <Glass radius={22} padding={22} innerStyle={{ alignItems: 'center', gap: 8 }}>
            <Icon name="coin" size={34} color={colors.gold} strokeWidth={1.6} />
            <Text style={styles.emptyTitle}>Sin movimientos este mes</Text>
            <Text style={styles.emptyDesc}>Registra tu primer gasto o ingreso</Text>
          </Glass>
        ) : (
          <Glass radius={22} padding={0}>
            {recent.map((t, i) => {
              const isGasto = t.kind === 'gasto';
              return (
                <View key={t.id} style={[styles.txRow, i < recent.length - 1 && styles.txDivider]}>
                  <View style={[styles.txIcon, { backgroundColor: isGasto ? colors.goldSoft : colors.greenSoft }]}>
                    <Icon name={txIcon(t.kind, t.category_id)} size={20} color={isGasto ? colors.gold : colors.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txDesc} numberOfLines={1}>{t.descripcion}</Text>
                    <Text style={styles.txMeta}>{t.occurred_on} · {t.medio ?? 'efectivo'}</Text>
                  </View>
                  <Text style={[styles.txAmt, { color: isGasto ? colors.onDark : colors.green }]}>
                    {isGasto ? '−' : '+'}{formatCurrency(Number(t.monto), t.moneda)}
                  </Text>
                </View>
              );
            })}
          </Glass>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 130, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { fontSize: 13, color: colors.onDarkMuted },
  userName: { fontSize: 25, fontFamily: fonts.heading, color: colors.onDark, lineHeight: 30 },
  periodPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: colors.goldBorder,
  },
  periodText: { fontSize: 12, fontWeight: '800', color: colors.goldBright },

  heroLabel: { fontSize: 13, fontWeight: '700', color: colors.onDarkMuted },
  heroValue: { fontSize: 40, fontFamily: fonts.heading, fontWeight: '800', marginTop: 2, letterSpacing: -0.5 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingLeft: 8,
    paddingRight: 10,
    borderRadius: radius.pill,
    marginTop: 6,
  },
  chipText: { fontSize: 12, fontWeight: '800' },
  attHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  attTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.onDark },
  attLink: { fontSize: 12.5, fontWeight: '700', color: colors.gold },
  attRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  attName: { fontSize: 13.5, fontWeight: '600', color: colors.onDark },
  attSub: { fontSize: 11.5, color: colors.onDarkMuted, marginTop: 1 },
  attAmt: { fontSize: 13, fontWeight: '800', color: colors.goldBright },
  attMore: { fontSize: 12, color: colors.onDarkMuted, marginTop: 4 },
  accountsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13,
    borderRadius: 18, borderWidth: 1, borderColor: colors.goldBorder, backgroundColor: colors.goldSoft,
  },
  accountsText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.onDark },
  flowRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 6, marginTop: -4 },
  flowText: { fontSize: 12, fontWeight: '700', color: colors.onDarkMuted },
  accountsValue: { fontSize: 14, fontWeight: '800', color: colors.goldBright },
  heroFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  heroFootText: { fontSize: 12, fontWeight: '700', color: colors.onDarkMuted },

  pair: { flexDirection: 'row', gap: 12 },
  pairHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pairLabel: { fontSize: 12, fontWeight: '700', color: colors.onDarkMuted },
  pairValue: { fontSize: 17, fontWeight: '800', color: colors.onDark, marginTop: 4 },

  scoreInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  scoreTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4, color: colors.onDarkMuted },
  scoreGrade: { fontSize: 22, fontFamily: fonts.heading, fontWeight: '800', color: colors.goldBright },
  scoreNext: { fontSize: 13, color: colors.onDarkMuted },

  actions: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  action: { flex: 1, alignItems: 'center', gap: 8 },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 12, fontWeight: '700', color: colors.onDark },

  tileTitle: { fontSize: 15, fontWeight: '800', color: colors.onDark, marginTop: 10 },
  tileSub: { fontSize: 12, color: colors.onDarkMuted, marginTop: 2 },

  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontFamily: fonts.heading, color: colors.onDark },
  seeAll: { fontSize: 13, fontWeight: '800', color: colors.gold },

  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  txDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  txIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: 14, fontWeight: '700', color: colors.onDark },
  txMeta: { fontSize: 12, color: colors.onDarkMuted, marginTop: 1 },
  txAmt: { fontSize: 14, fontWeight: '800' },

  daySummaryTitle: { fontSize: 16, fontFamily: fonts.heading },
  daySummaryLine: { fontSize: 13.5, color: colors.onDark, lineHeight: 20 },
  daySummaryClosing: { fontSize: 12.5, fontStyle: 'italic', color: colors.onDarkMuted, marginTop: 2 },
  daySummaryBtn: { alignSelf: 'flex-start', marginTop: 4, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.gold },
  daySummaryBtnText: { color: colors.bg, fontWeight: '800', fontSize: 13 },
  budgetRow: { paddingHorizontal: 16, paddingVertical: 12 },
  budgetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  budgetTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 8, overflow: 'hidden' },
  budgetFill: { height: '100%', borderRadius: 3 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.onDark },
  emptyDesc: { fontSize: 13, color: colors.onDarkMuted },
});
