import React, { useState, useMemo } from 'react';
import { tr } from '../lib/i18n';
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
import { useDebts } from '../hooks/useDebts';
import { useBankAccounts } from '../hooks/useBankAccounts';
import { useDebtPayments } from '../hooks/useDebtPayments';
import { useAccounts } from '../hooks/useAccounts';
import { useDebtSchedule } from '../hooks/useDebtSchedule';
import { DebtForm } from '../components/DebtForm';
import { debtCycle, lastAndNextDue } from '../lib/debtDates';
import { addMonths, extraCapacity, loanProgress } from '../lib/amortization';
import { useLoanPayments } from '../hooks/useLoanPayments';
import { useFinancialScore } from '../hooks/useFinancialScore';
import { dueLabel } from '../lib/reminders';
import { AccountPicker } from '../components/AccountPicker';
import { accountCurrency, accountMoney, amountInAccount, debtCurrency, fundingFor, fundsError, toDb, type AccountRef } from '../lib/money';
import { CURRENCIES, baseCurrency, convert, formatCurrency, numberText, parseAmount, round2 } from '../lib/currency';
import { colors, spacing, radius, shadow, glass } from '../theme';
import type { AccountBalanceRow, DebtRow, BankAccountRow } from '../types/db';
import { dateLocale } from '../lib/i18n';

function fmt(n: number) {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

// Months to pay off a loan given balance, monthly payment, monthly rate
function monthsToPayoff(saldo: number, cuota: number, monthlyRate: number): number {
  if (saldo <= 0) return 0;
  if (monthlyRate === 0) return cuota > 0 ? Math.ceil(saldo / cuota) : 999;
  // n = -ln(1 - r*B/P) / ln(1+r)
  const ratio = (monthlyRate * saldo) / cuota;
  if (ratio >= 1) return 999; // payment doesn't cover interest
  return Math.ceil(-Math.log(1 - ratio) / Math.log(1 + monthlyRate));
}

function AccountChips({
  accounts,
  selectedId,
  onSelect,
}: {
  accounts: BankAccountRow[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const options = [
    { id: null, label: '💵 Efectivo' },
    ...accounts.map((a) => ({
      id: a.id,
      label: `${a.banco}${a.ultimos4 ? ` ••••${a.ultimos4}` : ''}`,
    })),
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', gap: spacing.sm, paddingBottom: 4 }}>
        {options.map((opt) => {
          const active = selectedId === opt.id;
          return (
            <Pressable
              key={String(opt.id)}
              style={[chipS.chip, active && chipS.chipActive]}
              onPress={() => onSelect(opt.id)}
            >
              <Text style={[chipS.chipText, active && chipS.chipTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

// Mensaje fijo de lo que llevas ahorrado en intereses por pagar de más
function SavingsNote({ sym, saved, months, extraPaid }: { sym: string; saved: number; months: number; extraPaid: number }) {
  if (saved < -0.5) {
    return (
      <View style={[s.savingsCard, { borderColor: colors.rust }]}>
        <Text style={[s.savingsTitle, { color: colors.rust }]}>Ojo con los pagos por debajo de la cuota</Text>
        <Text style={s.savingsText}>{`Pagar menos que la cuota te cuesta ${sym}${fmt(-saved)} más en intereses.`}</Text>
      </View>
    );
  }
  if (saved < 0.5 && months <= 0) return null;
  const text = months <= 0
    ? `Vas ahorrando ${sym}${fmt(saved)} en intereses`
    : months === 1
      ? `Vas ahorrando ${sym}${fmt(saved)} en intereses y terminas 1 mes antes`
      : `Vas ahorrando ${sym}${fmt(saved)} en intereses y terminas ${months} meses antes`;
  return (
    <View style={s.savingsCard}>
      <Text style={s.savingsTitle}>¡Buen ritmo!</Text>
      <Text style={s.savingsText}>{text}</Text>
      {extraPaid > 0 && <Text style={s.savingsSub}>{`Llevas ${sym}${fmt(extraPaid)} pagados de más: cada peso extra va directo a capital.`}</Text>}
    </View>
  );
}

// ── Payment detail modal for a single debt ─────────────────────────────────
function DebtPaymentModal({
  debt,
  accounts,
  findAccount,
  onClose,
  onPaid,
}: {
  debt: DebtRow;
  accounts: AccountBalanceRow[];
  findAccount: (ref: AccountRef | null) => AccountBalanceRow | undefined;
  onClose: () => void;
  onPaid: () => void;
}) {
  const { payments, loading: loadPay, recordPayment, totalPagado, totalCapital, totalInteres } = useDebtPayments(debt.id, !!debt.card_id);

  const [tab, setTab] = useState<'pagar' | 'amortizacion' | 'historial'>('pagar');
  const isLoan = debt.tipo === 'prestamo' && !debt.card_id;
  const [montoInput, setMontoInput] = useState(String(debt.cuota_mensual || ''));
  const [payAccount, setPayAccount] = useState<AccountRef | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const cur = debtCurrency(debt);
  const sym = CURRENCIES[cur].symbol;
  const [debited, setDebited] = useState('');
  const saldo = Number(debt.saldo);
  const tasa = Number(debt.tasa_anual);
  const monthlyRate = tasa / 12 / 100;
  const cuota = Number(debt.cuota_mensual);

  const monto = parseFloat(montoInput.replace(',', '.')) || 0;
  const interesEsteMes = saldo * monthlyRate;
  const capitalEsteMes = Math.max(0, monto - interesEsteMes);
  const nuevoSaldo = Math.max(0, saldo - capitalEsteMes);

  const { householdId: hhId } = useAuth();
  const score = useFinancialScore(hhId);
  const [extraInput, setExtraInput] = useState('');
  const extraMonthly = isLoan ? Math.max(0, parseAmount(extraInput) || 0) : 0;
  // Si ya pagaste el ciclo de este mes, la próxima cuota es la del mes siguiente.
  const nextDate = (() => {
    if (!debt.dia_pago) return null;
    const next = lastAndNextDue(debt.dia_pago).next;
    const c = debtCycle(debt, payments.map((p) => ({ debt_id: debt.id, occurred_on: p.occurred_on })));
    return c?.nextPaid ? addMonths(next, 1) : next;
  })();
  const loanArgs = { saldo, cuota, tasaAnual: tasa };
  const real = useMemo(() => (isLoan ? loanProgress(loanArgs, payments, { nextDate }) : null), [isLoan, saldo, cuota, tasa, payments, nextDate]);
  const sim = useMemo(
    () => (isLoan ? (extraMonthly > 0 ? loanProgress(loanArgs, payments, { extraMonthly, nextDate }) : real) : null),
    [isLoan, extraMonthly, real, payments, nextDate, saldo, cuota, tasa]
  );
  const pillar = (key: string) => score.result?.pillars.find((p) => p.key === key)?.score ?? null;
  const capacity = extraCapacity({ colchon: pillar('colchon'), ahorro: pillar('ahorro'), gasto: pillar('gasto') });
  const suggestExtra = Math.round(cuota * capacity.pct) / 100;
  const suggestSim = useMemo(
    () => (isLoan && suggestExtra > 0 ? loanProgress(loanArgs, payments, { extraMonthly: suggestExtra, nextDate }) : null),
    [isLoan, suggestExtra, payments, nextDate, saldo, cuota, tasa]
  );
  const sugGainMonths = suggestSim && real ? real.remaining.rows.length - suggestSim.remaining.rows.length : 0;
  const sugGainInterest = suggestSim && real ? Math.round((real.remaining.totalInteres - suggestSim.remaining.totalInteres) * 100) / 100 : 0;
  const simGainMonths = sim && real ? real.remaining.rows.length - sim.remaining.rows.length : 0;
  const simGainInterest = sim && real ? Math.round((real.remaining.totalInteres - sim.remaining.totalInteres) * 100) / 100 : 0;

  const savingsBanner = real ? <SavingsNote sym={sym} saved={real.interestSaved} months={real.monthsSaved} extraPaid={real.extraPaid} /> : null;

  const suggestion = (() => {
    if (capacity.level === 'sin-datos') {
      return <Text style={s.sugText}>Registra tus ingresos y gastos para sugerirte un pago extra que tu presupuesto aguante.</Text>;
    }
    if (capacity.level === 'primero-colchon') {
      return <Text style={s.sugText}>Antes de pagar de más, arma tu colchón: cuando cubra al menos 1 mes de gastos te sugeriré un extra seguro.</Text>;
    }
    if (!suggestSim || sugGainMonths <= 0) {
      return <Text style={s.sugText}>Tu préstamo ya está casi saldado: pagar la cuota normal es suficiente.</Text>;
    }
    const gain = sugGainMonths === 1
      ? `Según tu perfil puedes sumar ${sym}${fmt(suggestExtra)} al mes (+${capacity.pct}%): terminarías 1 mes antes y ahorrarías ${sym}${fmt(sugGainInterest)} más en intereses.`
      : `Según tu perfil puedes sumar ${sym}${fmt(suggestExtra)} al mes (+${capacity.pct}%): terminarías ${sugGainMonths} meses antes y ahorrarías ${sym}${fmt(sugGainInterest)} más en intereses.`;
    return (
      <>
        <Text style={s.sugText}>{gain}</Text>
        <Pressable style={s.sugBtn} onPress={() => setExtraInput(String(suggestExtra))}>
          <Text style={s.sugBtnText}>{`Probar +${sym}${fmt(suggestExtra)} al mes`}</Text>
        </Pressable>
      </>
    );
  })();

  const mesesActual = monthsToPayoff(nuevoSaldo, cuota, monthlyRate);
  const meses110 = monthsToPayoff(nuevoSaldo, cuota * 1.1, monthlyRate);
  const meses125 = monthsToPayoff(nuevoSaldo, cuota * 1.25, monthlyRate);
  const meses150 = monthsToPayoff(nuevoSaldo, cuota * 1.5, monthlyRate);

  // Si pagas desde una cuenta en otra moneda, sale lo convertido; puedes escribir lo que tu banco cobró de verdad.
  const account = findAccount(payAccount);
  const accCur = account ? accountCurrency(account) : cur;
  const crossCurrency = !!account && accCur !== cur;
  const debitedNum = crossCurrency ? parseAmount(debited) || 0 : 0;
  // Última tasa que el banco cobró en pagos de esta deuda desde cuentas de la misma moneda (pesos cobrados ÷ dólares pagados).
  const lastRate = (() => {
    if (!crossCurrency) return 0;
    for (const p of payments) {
      if (!(Number(p.monto_cuenta) > 0) || !(Number(p.monto_total) > 0)) continue;
      const payAcc = p.bank_account_id ? accounts.find((a) => a.bank_account_id === p.bank_account_id) : undefined;
      const payCur = p.bank_account_id ? accountCurrency(payAcc) : (p.moneda as string | null) ?? 'DOP';
      if (payCur === accCur) return Number(p.monto_cuenta) / Number(p.monto_total);
    }
    return 0;
  })();
  const suggested = crossCurrency ? (lastRate > 0 ? Math.round(monto * lastRate * 100) / 100 : amountInAccount(account, monto, cur)) : 0;
  const accountAmount = crossCurrency ? (debitedNum > 0 ? debitedNum : suggested) : monto;
  const effectiveRate = crossCurrency && monto > 0 ? accountAmount / monto : 0;

  async function handlePay() {
    if (!monto || monto <= 0) { Alert.alert('Monto inválido', 'Ingresa un monto mayor a 0.'); return; }
    if (monto < interesEsteMes && interesEsteMes > 0) {
      Alert.alert('Pago insuficiente', (`El interés de este mes es ${sym}${fmt(interesEsteMes)}. El pago no cubre ni los intereses.`));
      return;
    }
    if (!payAccount) { Alert.alert('Elige una cuenta', 'Indica de qué cuenta sale el pago.'); return; }
    const noFunds = fundsError(account, accountAmount);
    if (noFunds) { Alert.alert('Sin fondos', noFunds); return; }
    setSaving(true);
    const { error } = await recordPayment({
      monto_total: monto,
      capital: capitalEsteMes,
      interes: interesEsteMes,
      saldo_anterior: saldo,
      saldo_nuevo: nuevoSaldo,
      ...toDb(payAccount),
      ...fundingFor(account, monto, cur, debitedNum > 0 ? debitedNum : undefined),
      newSaldo: nuevoSaldo,
    });
    setSaving(false);
    if (error) { Alert.alert('Error', error); return; }
    setShowSuccess(true);
    setTimeout(() => { setShowSuccess(false); onPaid(); }, 1500);
  }

  return (
    <View style={s.modalCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <Text style={s.modalTitle}>{debt.nombre}</Text>
        <Pressable onPress={onClose}><Text style={{ fontSize: 18, color: colors.onDarkMuted }}>✕</Text></Pressable>
      </View>

      {/* Tab bar */}
      <View style={s.tabRow}>
        {(isLoan ? (['pagar', 'amortizacion', 'historial'] as const) : (['pagar', 'historial'] as const)).map((t) => (
          <Pressable key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'pagar' ? '💳 Pagar' : t === 'amortizacion' ? '📅 Amortización' : `📋 Historial (${payments.length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {tab === 'pagar' ? (
          <>
            {isLoan && savingsBanner}

            {/* Current balance summary */}
            <View style={s.balanceBanner}>
              <View style={{ flex: 1 }}>
                <Text style={s.bannerLabel}>Saldo pendiente</Text>
                <Text style={s.bannerValue}>{sym}{fmt(saldo)}</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={s.bannerLabel}>Tasa mensual</Text>
                <Text style={[s.bannerValue, { color: tasa > 0 ? colors.gold : colors.muted }]}>
                  {tasa > 0 ? `${(tasa / 12).toFixed(2)}%` : 'N/D'}
                </Text>
              </View>
            </View>

            {/* Rate guide if unknown */}
            {tasa === 0 && !debt.card_id && (
              <View style={s.guideBox}>
                <Text style={s.guideTitle}>📌 ¿No sabes tu tasa?</Text>
                <Text style={s.guideBody}>
                  Búscala en:{'\n'}
                  {'  '}• Estado de cuenta (sección "Tasa de interés" o "APR"){'\n'}
                  {'  '}• App del banco → detalles del préstamo{'\n'}
                  {'  '}• Contrato original del préstamo{'\n'}
                  {'  '}• Llama al banco y pide la "TNA" (tasa nominal anual){'\n\n'}
                  Sin la tasa, el desglose capital/interés es estimado.
                </Text>
              </View>
            )}

            {/* Payment input */}
            <Text style={s.label}>{`MONTO DEL PAGO (${sym})`}</Text>
            <TextInput
              style={s.input}
              value={montoInput}
              onChangeText={setMontoInput}
              keyboardType="decimal-pad"
              placeholder={fmt(cuota)}
              placeholderTextColor={colors.muted}
            />

            {/* Breakdown */}
            {monto > 0 && (
              <View style={s.breakdownCard}>
                <Text style={s.breakdownTitle}>Desglose de este pago</Text>
                <View style={s.breakdownRow}>
                  <Text style={s.breakdownLabel}>💰 Capital (reduce deuda)</Text>
                  <Text style={[s.breakdownVal, { color: colors.green }]}>{sym}{fmt(capitalEsteMes)}</Text>
                </View>
                <View style={s.breakdownRow}>
                  <Text style={s.breakdownLabel}>🏦 Interés (costo del préstamo)</Text>
                  <Text style={[s.breakdownVal, { color: colors.rust }]}>{sym}{fmt(interesEsteMes)}</Text>
                </View>
                <View style={[s.breakdownRow, { borderTopWidth: 1, borderTopColor: colors.glassBorder, marginTop: 4, paddingTop: 8 }]}>
                  <Text style={[s.breakdownLabel, { fontWeight: '700', color: colors.onDark }]}>Saldo nuevo</Text>
                  <Text style={[s.breakdownVal, { fontWeight: '700', color: colors.gold }]}>{sym}{fmt(nuevoSaldo)}</Text>
                </View>
              </View>
            )}

            {/* Payoff scenarios */}
            {nuevoSaldo > 0 && cuota > 0 && (
              <View style={s.scenariosCard}>
                <Text style={s.breakdownTitle}>⚡ Opciones para terminar más rápido</Text>
                <Text style={s.scenarioNote}>Según tu perfil, pagando más capital ahorras en intereses:</Text>
                {[
                  { label: 'Cuota normal', cuotaLabel: fmt(cuota), meses: mesesActual, extra: 0 },
                  { label: '+10% extra', cuotaLabel: fmt(cuota * 1.1), meses: meses110, extra: 10 },
                  { label: '+25% extra', cuotaLabel: fmt(cuota * 1.25), meses: meses125, extra: 25 },
                  { label: '+50% extra', cuotaLabel: fmt(cuota * 1.5), meses: meses150, extra: 50 },
                ].map((sc) => (
                  <View key={sc.label} style={s.scenarioRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.scenarioLabel}>{sc.label}</Text>
                      <Text style={s.scenarioCuota}>{sym}{sc.cuotaLabel}/mes</Text>
                    </View>
                    <View style={s.scenarioBadge}>
                      <Text style={s.scenarioBadgeText}>
                        {sc.meses >= 999 ? '∞' : `${sc.meses} mes${sc.meses !== 1 ? 'es' : ''}`}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Account picker */}
            <AccountPicker
              accounts={accounts}
              value={payAccount}
              onChange={setPayAccount}
              amount={monto}
              amountCurrency={cur}
              label="¿De qué cuenta sale el pago?"
            />

            {crossCurrency && monto > 0 && account && (
              <View style={s.convertBox}>
                <Text style={s.label}>{`LO QUE SALE DE TU CUENTA (${CURRENCIES[accCur].symbol})`}</Text>
                <TextInput
                  style={s.input}
                  value={debited}
                  onChangeText={setDebited}
                  keyboardType="decimal-pad"
                  placeholder={numberText(suggested)}
                  placeholderTextColor={colors.muted}
                  accessibilityLabel="Monto que cobra tu banco"
                />
                <Text style={s.convertNote}>
                  {`Pagas ${sym}${fmt(monto)} desde una cuenta en ${CURRENCIES[accCur].symbol}. ${
                    lastRate > 0
                      ? `Con la última tasa que te cobró este banco (${CURRENCIES[accCur].symbol} ${numberText(lastRate)}) salen`
                      : 'Con la tasa de mercado de hoy salen'
                  } ${accountMoney(account, suggested)}. Si tu banco aplicó otra tasa, escribe lo que te cobró: la tasa de este pago queda en ${CURRENCIES[accCur].symbol} ${numberText(effectiveRate)} por cada ${sym}.`}
                </Text>
              </View>
            )}

            <Pressable style={[s.btn, { marginTop: spacing.lg }]} onPress={handlePay} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#FFF" />
                : showSuccess
                ? <Text style={s.btnText}>✓ ¡Pago registrado!</Text>
                : <Text style={s.btnText}>{`Registrar pago de ${sym}${monto > 0 ? fmt(monto) : '—'}`}</Text>
              }
            </Pressable>
          </>
        ) : tab === 'amortizacion' ? (
          <>
            {!real || !sim || !sim.remaining.viable ? (
              <View style={s.emptyHist}>
                <Text style={s.emptyHistText}>
                  {cuota > 0
                    ? `La cuota de ${sym}${fmt(cuota)} no cubre el interés del mes (${sym}${fmt(saldo * monthlyRate)}): el saldo no bajaría. Sube la cuota o revisa la tasa.`
                    : 'Este préstamo no tiene cuota mensual. Edítalo y escribe la cuota para ver la tabla de amortización.'}
                </Text>
              </View>
            ) : sim.remaining.rows.length === 0 && real.paid.length === 0 ? (
              <View style={s.emptyHist}>
                <Text style={s.emptyHistText}>Este préstamo ya está saldado.</Text>
              </View>
            ) : (
              <>
                {savingsBanner}

                <View style={s.histSummary}>
                  <View style={s.histSumItem}>
                    <Text style={s.histSumLabel}>Cuotas restantes</Text>
                    <Text style={[s.histSumVal, { color: colors.gold }]}>{sim.remaining.rows.length}{sim.remaining.truncated ? '+' : ''}</Text>
                  </View>
                  <View style={s.histSumItem}>
                    <Text style={s.histSumLabel}>Interés que falta</Text>
                    <Text style={[s.histSumVal, { color: colors.rust }]}>{sym}{fmt(sim.remaining.totalInteres)}</Text>
                  </View>
                  <View style={s.histSumItem}>
                    <Text style={s.histSumLabel}>Falta por pagar</Text>
                    <Text style={[s.histSumVal, { color: colors.gold }]}>{sym}{fmt(sim.remaining.totalPagado)}</Text>
                  </View>
                </View>
                {tasa === 0 && <Text style={s.emptyHistText}>Sin tasa registrada: la tabla no incluye intereses.</Text>}

                {/* Pago extra inteligente: sugerencia según tu perfil */}
                <View style={s.sugCard}>
                  <Text style={s.sugTitle}>Pago extra inteligente</Text>
                  {suggestion}
                </View>

                {/* Simulador */}
                <Text style={[s.label, { marginTop: spacing.md }]}>{`SIMULAR UN PAGO EXTRA AL MES (${sym})`}</Text>
                <TextInput
                  style={s.input}
                  value={extraInput}
                  onChangeText={setExtraInput}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.muted}
                  accessibilityLabel="Pago extra mensual a simular"
                />
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                  {[10, 25, 50].map((p) => (
                    <Pressable key={p} style={chipS.chip} onPress={() => setExtraInput(String(Math.round(cuota * p) / 100))}>
                      <Text style={chipS.chipText}>{`+${p}%`}</Text>
                    </Pressable>
                  ))}
                  {extraMonthly > 0 && (
                    <Pressable style={chipS.chip} onPress={() => setExtraInput('')}>
                      <Text style={chipS.chipText}>Quitar</Text>
                    </Pressable>
                  )}
                </View>
                {extraMonthly > 0 && simGainMonths > 0 && (
                  <Text style={[s.simNote, { color: colors.green }]}>
                    {`Con ${sym}${fmt(extraMonthly)} extra cada mes terminas en ${sim.remaining.rows.length} cuotas (en vez de ${real.remaining.rows.length}) y ahorras ${sym}${fmt(simGainInterest)} más en intereses.`}
                  </Text>
                )}

                <View style={[s.amortRow, s.amortHead, { marginTop: spacing.lg }]}>
                  <Text style={[s.amortCellN, s.amortHeadText]}>Cuota</Text>
                  <Text style={[s.amortCell, s.amortHeadText]}>Interés</Text>
                  <Text style={[s.amortCell, s.amortHeadText]}>Capital</Text>
                  <Text style={[s.amortCell, s.amortHeadText]}>Saldo</Text>
                </View>
                {real.paid.map((r) => (
                  <View key={`p${r.n}`} style={[s.amortRow, s.amortPaid]}>
                    <View style={s.amortCellN}>
                      <Text style={s.amortNum}>#{r.n}</Text>
                      {r.date && <Text style={s.amortDate}>{fmtDate(r.date)}</Text>}
                      <Text style={s.extraChip}>Pagada</Text>
                      {r.extra > 0 && <Text style={s.extraChip}>{`+${sym}${fmt(r.extra)} extra`}</Text>}
                    </View>
                    <Text style={[s.amortCell, { color: colors.rust }]}>{fmt(r.interes)}</Text>
                    <Text style={[s.amortCell, { color: colors.green }]}>{fmt(r.capital)}</Text>
                    <Text style={[s.amortCell, { color: colors.onDark, fontWeight: '700' }]}>{fmt(r.saldo)}</Text>
                  </View>
                ))}
                {sim.remaining.rows.map((r, i) => (
                  <View key={`f${r.n}`} style={s.amortRow}>
                    <View style={s.amortCellN}>
                      <Text style={s.amortNum}>#{r.n}</Text>
                      {r.date && <Text style={s.amortDate}>{fmtDate(r.date)}</Text>}
                      {i === 0 && (
                        <Pressable
                          onPress={() => { setMontoInput(String(Math.round((cuota + extraMonthly) * 100) / 100)); setTab('pagar'); }}
                          accessibilityLabel="Pagar esta cuota"
                        >
                          <Text style={s.payNow}>Pagar</Text>
                        </Pressable>
                      )}
                    </View>
                    <Text style={[s.amortCell, { color: colors.rust }]}>{fmt(r.interes)}</Text>
                    <Text style={[s.amortCell, { color: colors.green }]}>{fmt(r.capital)}</Text>
                    <Text style={[s.amortCell, { color: colors.onDark, fontWeight: '700' }]}>{fmt(r.saldo)}</Text>
                  </View>
                ))}
                <Text style={[s.emptyHistText, { marginTop: spacing.md }]}>
                  {`Las cuotas marcadas como Pagada ya las pagaste (salen de tu historial). Lo demás es una proyección con tu cuota de ${sym}${fmt(cuota)}; si pagas más o menos, se recalcula sola.`}
                </Text>
              </>
            )}
          </>
        ) : (
          <>
            {/* Summary totals */}
            <View style={s.histSummary}>
              <View style={s.histSumItem}>
                <Text style={s.histSumLabel}>Total pagado</Text>
                <Text style={[s.histSumVal, { color: colors.gold }]}>{sym}{fmt(totalPagado)}</Text>
              </View>
              <View style={s.histSumItem}>
                <Text style={s.histSumLabel}>Capital</Text>
                <Text style={[s.histSumVal, { color: colors.green }]}>{sym}{fmt(totalCapital)}</Text>
              </View>
              <View style={s.histSumItem}>
                <Text style={s.histSumLabel}>Interés</Text>
                <Text style={[s.histSumVal, { color: colors.rust }]}>{sym}{fmt(totalInteres)}</Text>
              </View>
            </View>

            {loadPay ? (
              <ActivityIndicator color={colors.navy} style={{ marginTop: 24 }} />
            ) : payments.length === 0 ? (
              <View style={s.emptyHist}>
                <Text style={s.emptyHistText}>Aún no hay pagos registrados.{'\n'}Registra tu primer pago en la pestaña "Pagar".</Text>
              </View>
            ) : (
              payments.map((p) => (
                <View key={p.id} style={s.paymentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.payDate}>{fmtDate(p.occurred_on)}</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 4 }}>
                      <Text style={s.payCapital}>Capital: {sym}{fmt(Number(p.capital))}</Text>
                      <Text style={s.payInteres}>Interés: {sym}{fmt(Number(p.interes))}</Text>
                    </View>
                    {Number(p.monto_cuenta) > 0 && Number(p.monto_total) > 0 && (
                      <Text style={s.payRate}>
                        Salió {numberText(Number(p.monto_cuenta))} de tu cuenta · tasa {numberText(Number(p.monto_cuenta) / Number(p.monto_total))}
                      </Text>
                    )}
                  </View>
                  <Text style={s.payTotal}>{sym}{fmt(Number(p.monto_total))}</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export function DeudasScreen() {
  const { householdId } = useAuth();
  const { debts, loading, addDebt, updateDebt, deleteDebt, totalDeuda, totalCuotaMensual, totalInteresAnual, totalsByCurrency, reload } = useDebts(householdId);
  const { accounts, cards } = useBankAccounts(householdId);
  const { payments: dueHistory, reload: reloadSchedule } = useDebtSchedule(householdId);
  const [editingDebt, setEditingDebt] = useState<DebtRow | null>(null);
  const { accounts: balances, find: findAccount, reload: reloadAccounts } = useAccounts(householdId);
  const loanIds = debts.filter((d) => d.tipo === 'prestamo' && !d.card_id && (!d.status || d.status === 'pendiente')).map((d) => d.id);
  const { byDebt: loanPayments, reload: reloadLoans } = useLoanPayments(loanIds);

  // Modal: add debt
  const [showModal, setShowModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [saldo, setSaldo] = useState('');
  const [cuota, setCuota] = useState('');
  const [tasa, setTasa] = useState('');
  const [debtStatus, setDebtStatus] = useState<'pendiente' | 'pagada'>('pendiente');
  const [debtAccountId, setDebtAccountId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal: payment detail
  const [selectedDebt, setSelectedDebt] = useState<DebtRow | null>(null);

  function resetModal() {
    setNombre(''); setSaldo(''); setCuota(''); setTasa('');
    setDebtStatus('pendiente'); setDebtAccountId(null);
  }

  async function handleAdd() {
    const saldoVal = parseFloat(saldo.replace(',', '.'));
    const cuotaVal = parseFloat(cuota.replace(',', '.'));
    if (!nombre.trim() || !saldoVal || !cuotaVal) {
      Alert.alert('Datos incompletos', 'Ingresa nombre, saldo y cuota mensual.');
      return;
    }
    setSaving(true);
    const { error } = await addDebt({
      nombre: nombre.trim(),
      saldo: saldoVal,
      cuota_mensual: cuotaVal,
      tasa_anual: parseFloat(tasa) || 0,
      status: debtStatus,
      bank_account_id: debtStatus === 'pagada' ? debtAccountId : null,
    });
    setSaving(false);
    if (error) Alert.alert('Error', error);
    else { setShowModal(false); resetModal(); }
  }

  function confirmDelete(id: string, name: string) {
    Alert.alert('Eliminar deuda', `¿Eliminar "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteDebt(id) },
    ]);
  }

  const pendientes = debts.filter((d) => !d.status || d.status === 'pendiente');
  const pagadas = debts.filter((d) => d.status === 'pagada');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[colors.bgDeep, colors.bg]} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.sumItem}>
              <Text style={styles.sumLabel}>Total deuda</Text>
              <Text style={styles.sumValue}>¤{fmt(totalDeuda)}</Text>
              {totalsByCurrency.length > 1 && (
                <Text style={styles.sumSplit}>{totalsByCurrency.map((x) => formatCurrency(x.saldo, x.moneda)).join(' + ')}</Text>
              )}
            </View>
            <View style={styles.sumSep} />
            <View style={styles.sumItem}>
              <Text style={styles.sumLabel}>Cuota mensual</Text>
              <Text style={styles.sumValue}>¤{fmt(totalCuotaMensual)}</Text>
            </View>
            <View style={styles.sumSep} />
            <View style={styles.sumItem}>
              <Text style={styles.sumLabel}>Interés anual</Text>
              <Text style={[styles.sumValue, { color: colors.gold }]}>¤{fmt(totalInteresAnual)}</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.navy} style={{ marginTop: 32 }} />
        ) : debts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>Sin deudas registradas</Text>
            <Text style={styles.emptyDesc}>Registra tus préstamos y tarjetas para hacer seguimiento exacto de pagos</Text>
          </View>
        ) : (
          <>
            {pendientes.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>PENDIENTES</Text>
                {pendientes.map((debt) => {
                  const dcur = debtCurrency(debt);
                  const card = debt.card_id ? cards.find((c) => c.id === debt.card_id) : undefined;
                  const meses = debt.cuota_mensual > 0
                    ? monthsToPayoff(Number(debt.saldo), Number(debt.cuota_mensual), Number(debt.tasa_anual) / 12 / 100)
                    : 0;
                  return (
                    <Pressable key={debt.id} style={styles.debtCard} onPress={() => setSelectedDebt(debt)}>
                      <View style={styles.debtHeader}>
                        <View style={styles.debtIconWrap}>
                          <Text style={styles.debtIconText}>💳</Text>
                        </View>
                        <View style={styles.debtInfo}>
                          <Text style={styles.debtName}>{debt.nombre}</Text>
                          {card && !!card.limite && (
                            <Text style={styles.debtMeses}>
                              Tarjeta ••••{card.ultimos4} · Límite {formatCurrency(Number(card.limite), dcur)} · Disponible {formatCurrency(Math.max(0, Number(card.limite) - Number(debt.saldo)), dcur)}
                            </Text>
                          )}
                          <Text style={styles.debtMeses}>
                            {meses >= 999 ? 'Cuota no cubre interés' : meses > 0 ? `~${meses} meses restantes` : ''}
                            {Number(debt.tasa_anual) === 0 ? ' · tasa no registrada' : ''}
                          </Text>
                          {(() => {
                            const lp = loanPayments[debt.id];
                            if (!lp?.length || !(debt.cuota_mensual > 0)) return null;
                            const pr = loanProgress({ saldo: Number(debt.saldo), cuota: Number(debt.cuota_mensual), tasaAnual: Number(debt.tasa_anual) }, lp);
                            if (pr.interestSaved < 0.5 && pr.monthsSaved <= 0) return null;
                            const psym = CURRENCIES[dcur].symbol;
                            return (
                              <Text style={styles.savedLine}>
                                {pr.monthsSaved <= 0
                                  ? `Vas ahorrando ${psym}${fmt(pr.interestSaved)} en intereses`
                                  : pr.monthsSaved === 1
                                    ? `Vas ahorrando ${psym}${fmt(pr.interestSaved)} en intereses y terminas 1 mes antes`
                                    : `Vas ahorrando ${psym}${fmt(pr.interestSaved)} en intereses y terminas ${pr.monthsSaved} meses antes`}
                              </Text>
                            );
                          })()}
                          {(() => {
                            if (!debt.dia_pago) {
                              return debt.tipo !== 'otro' ? <Text style={styles.dueMissing}>Falta la fecha de pago: toca Editar para agregarla</Text> : null;
                            }
                            const c = debtCycle(debt, dueHistory);
                            if (!c) return null;
                            const text = c.lastOverdue
                              ? `${tr('Pago vencido')} (${dueLabel(c.last).toLowerCase()})`
                              : c.nextPaid
                                ? 'Pagado este ciclo'
                                : `${tr('Pago')} ${dueLabel(c.next).toLowerCase()}`;
                            return (
                              <Text style={[styles.dueLine, c.lastOverdue && { color: colors.rust }, c.nextPaid && { color: colors.green }]}>
                                {debt.dia_corte ? `Corte día ${debt.dia_corte} · ` : ''}Pago día {debt.dia_pago} · {text}
                              </Text>
                            );
                          })()}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.debtSaldo}>{formatCurrency(Number(debt.saldo), dcur)}</Text>
                          {dcur !== baseCurrency() && (
                            <Text style={styles.debtTasa}>≈ {formatCurrency(convert(Number(debt.saldo), dcur, baseCurrency()), baseCurrency())}</Text>
                          )}
                          <Text style={styles.debtTasa}>{Number(debt.tasa_anual).toFixed(1)}% anual</Text>
                        </View>
                      </View>

                      <View style={styles.debtProgressTrack}>
                        <View style={[styles.debtProgressFill, {
                          width: meses > 0 && meses < 999
                            ? `${Math.max(5, 100 - (meses / (meses + 6)) * 100)}%` as any
                            : '5%' as any
                        }]} />
                      </View>

                      <View style={styles.debtActions}>
                        <Pressable style={styles.payBtn} onPress={() => setSelectedDebt(debt)}>
                          <Text style={styles.payBtnText}>💳 Registrar pago</Text>
                        </Pressable>
                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                          {Number(debt.cuota_mensual) > 0 && <Text style={styles.cuotaChip}>{formatCurrency(Number(debt.cuota_mensual), dcur)}/mes</Text>}
                          <Pressable onPress={() => { setEditingDebt(debt); setShowModal(true); }} accessibilityLabel={`Editar ${debt.nombre}`}>
                            <Text style={styles.editBtnText}>Editar</Text>
                          </Pressable>
                          <Pressable onPress={() => confirmDelete(debt.id, debt.nombre)}>
                            <Text style={styles.deleteBtnText}>🗑</Text>
                          </Pressable>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </>
            )}

            {pagadas.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.green }]}>LIQUIDADAS ✓</Text>
                {pagadas.map((debt) => (
                  <View key={debt.id} style={[styles.debtCard, styles.debtCardPaid]}>
                    <View style={styles.debtHeader}>
                      <View style={[styles.debtIconWrap, { backgroundColor: colors.greenSoft }]}>
                        <Text style={styles.debtIconText}>✅</Text>
                      </View>
                      <View style={styles.debtInfo}>
                        <Text style={[styles.debtName, { color: colors.onDarkMuted }]}>{debt.nombre}</Text>
                        <Text style={styles.debtMeses}>Deuda liquidada</Text>
                      </View>
                      <Pressable onPress={() => confirmDelete(debt.id, debt.nombre)}>
                        <Text style={styles.deleteBtnText}>🗑</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {pendientes.length > 0 && (
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>💡 Método Avalancha</Text>
            <Text style={styles.tipBody}>
              Paga el mínimo en todas las deudas y enfoca el dinero extra en la de mayor tasa de interés. Ahorrarás más a largo plazo.
            </Text>
          </View>
        )}

        <Pressable style={styles.addBtn} onPress={() => { setEditingDebt(null); resetModal(); setShowModal(true); }}>
          <Text style={styles.addBtnText}>+ Agregar Deuda / Préstamo</Text>
        </Pressable>
      </ScrollView>

      {/* Modal: Add Debt */}
      <DebtForm
        visible={showModal}
        onClose={() => { setShowModal(false); setEditingDebt(null); }}
        debt={editingDebt}
        cards={cards}
        onSave={async (input, id) => {
          const res = id ? await updateDebt(id, input) : await addDebt(input);
          if (!res.error) reloadSchedule();
          return res;
        }}
      />

      {/* Modal: Payment detail */}
      <Modal visible={!!selectedDebt} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedDebt(null)}>
          <Pressable style={{ flex: 1, justifyContent: 'flex-end' }} onPress={() => {}}>
            {selectedDebt && (
              <DebtPaymentModal
                debt={selectedDebt}
                accounts={balances}
                findAccount={findAccount}
                onClose={() => setSelectedDebt(null)}
                onPaid={() => { setSelectedDebt(null); reload(); reloadAccounts(); reloadSchedule(); reloadLoans(); }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 130 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2, marginBottom: spacing.sm, marginTop: spacing.md },

  summaryCard: { backgroundColor: colors.bgDeep, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadow.hero },
  summaryRow: { flexDirection: 'row' },
  sumItem: { flex: 1, alignItems: 'center' },
  sumLabel: { fontSize: 10, color: colors.onDarkMuted, marginBottom: 4 },
  sumSplit: { fontSize: 10.5, color: colors.onDarkMuted, marginTop: 3, textAlign: 'center' },
  sumValue: { fontSize: 15, fontWeight: '700', color: colors.onDark },
  sumSep: { width: 1, backgroundColor: 'rgba(0,0,0,0.10)', marginHorizontal: spacing.sm },

  emptyCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.xxl, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder, gap: spacing.sm },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.gold },
  emptyDesc: { fontSize: 13, color: colors.onDarkMuted, textAlign: 'center' },

  debtCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.glassBorder, ...shadow.card },
  debtCardPaid: { opacity: 0.7, borderColor: colors.greenBorder },
  debtHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  debtIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.rustSoft, alignItems: 'center', justifyContent: 'center' },
  debtIconText: { fontSize: 18 },
  debtInfo: { flex: 1 },
  debtName: { fontSize: 15, fontWeight: '700', color: colors.onDark, marginBottom: 2 },
  dueLine: { fontSize: 11.5, fontWeight: '600', color: colors.goldBright, marginTop: 3 },
  dueMissing: { fontSize: 11.5, fontWeight: '600', color: colors.neonAmber, marginTop: 3 },
  editBtnText: { fontSize: 12, fontWeight: '700', color: colors.gold },
  debtMeses: { fontSize: 11, color: colors.onDarkMuted },
  savedLine: { fontSize: 11.5, fontWeight: '700', color: colors.green, marginTop: 3 },
  debtSaldo: { fontSize: 16, fontWeight: '800', color: colors.rust },
  debtTasa: { fontSize: 10, color: colors.onDarkMuted, marginTop: 1 },
  debtProgressTrack: { height: 4, backgroundColor: colors.line, borderRadius: 2, overflow: 'hidden', marginBottom: spacing.md },
  debtProgressFill: { height: '100%', backgroundColor: colors.rust, borderRadius: 2 },
  debtActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payBtn: { backgroundColor: colors.bgDeep, borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 16 },
  payBtnText: { fontSize: 13, fontWeight: '700', color: colors.onDark },
  cuotaChip: { fontSize: 12, color: colors.onDarkMuted, fontWeight: '600', alignSelf: 'center' },
  deleteBtnText: { fontSize: 16, color: colors.onDarkMuted },

  tipCard: { backgroundColor: colors.greenSoft, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.greenBorder, marginBottom: spacing.lg },
  tipTitle: { fontSize: 13, fontWeight: '700', color: colors.green, marginBottom: spacing.sm },
  tipBody: { fontSize: 13, color: colors.green, lineHeight: 19 },

  addBtn: { backgroundColor: colors.bgDeep, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  addBtnText: { fontSize: 15, fontWeight: '700', color: colors.onDark },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCardWrap: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xxl, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.gold, marginBottom: spacing.md },
  modalLabel: { fontSize: 11, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1, marginBottom: spacing.sm },
  modalInput: { backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: 16, color: colors.onDark, marginBottom: spacing.xs },
  tasaHint: { fontSize: 11, color: colors.onDarkMuted, marginBottom: spacing.sm },
  modalBtn: { backgroundColor: colors.bgDeep, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: spacing.md },
  modalBtnText: { fontSize: 15, fontWeight: '700', color: colors.onDark },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  toggleBtn: { flex: 1, paddingVertical: 11, borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center', backgroundColor: colors.bg },
  toggleBtnActive: { backgroundColor: colors.bgDeep, borderColor: colors.navy },
  toggleBtnGreen: { backgroundColor: 'rgba(123,224,176,0.22)', borderColor: colors.green },
  toggleText: { fontSize: 13, fontWeight: '600', color: colors.onDarkMuted },
  toggleTextActive: { color: '#FFF' },
  noAccountNote: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.glassBorder },
  noAccountNoteText: { fontSize: 13, color: colors.onDarkMuted, lineHeight: 19 },
});

const chipS = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.glassBorder },
  chipActive: { backgroundColor: colors.bgDeep, borderColor: colors.navy },
  chipText: { fontSize: 13, color: colors.onDark, fontWeight: '500' },
  chipTextActive: { color: colors.onDark },
});

// Styles for the DebtPaymentModal (inner component)
const s = StyleSheet.create({
  modalCard: { backgroundColor: '#0C3A24', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xxl, maxHeight: '92%', borderWidth: 1, borderBottomWidth: 0, borderColor: 'rgba(226,190,75,0.35)' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.gold },
  tabRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center', backgroundColor: colors.bg },
  tabBtnActive: { backgroundColor: colors.bgDeep, borderColor: colors.navy },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.onDarkMuted },
  tabTextActive: { color: colors.onDark },

  balanceBanner: { flexDirection: 'row', backgroundColor: colors.bgDeep, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md },
  bannerLabel: { fontSize: 10, color: colors.onDarkMuted, marginBottom: 4 },
  bannerValue: { fontSize: 20, fontWeight: '800', color: colors.onDark },

  payRate: { fontSize: 11, color: colors.onDarkMuted, marginTop: 3 },
  guideBox: { backgroundColor: 'rgba(226,190,75,0.14)', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.goldBorder, marginBottom: spacing.md },
  guideTitle: { fontSize: 13, fontWeight: '700', color: colors.goldBright, marginBottom: 6 },
  guideBody: { fontSize: 12, color: colors.onDark, lineHeight: 20 },

  label: { fontSize: 11, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.sm },
  input: { backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: 16, color: colors.onDark, marginBottom: spacing.sm },
  convertBox: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: 'rgba(226,190,75,0.08)', borderWidth: 1, borderColor: colors.goldBorder },
  convertNote: { fontSize: 12, color: colors.onDarkMuted, lineHeight: 18 },

  breakdownCard: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: spacing.md, gap: 8 },
  breakdownTitle: { fontSize: 12, fontWeight: '700', color: colors.onDarkMuted, marginBottom: 4 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { fontSize: 13, color: colors.onDarkMuted },
  breakdownVal: { fontSize: 13, fontWeight: '700' },

  scenariosCard: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: spacing.md, gap: 6 },
  scenarioNote: { fontSize: 11, color: colors.onDarkMuted, marginBottom: 4 },
  scenarioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.glassBorder },
  scenarioLabel: { fontSize: 13, fontWeight: '600', color: colors.onDark },
  scenarioCuota: { fontSize: 11, color: colors.onDarkMuted },
  scenarioBadge: { backgroundColor: colors.bgDeep, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  scenarioBadgeText: { fontSize: 12, fontWeight: '700', color: colors.onDark },

  btn: { backgroundColor: colors.bgDeep, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '700', color: colors.onDark },

  histSummary: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: spacing.md },
  histSumItem: { flex: 1, alignItems: 'center' },
  histSumLabel: { fontSize: 10, color: colors.onDarkMuted, marginBottom: 3 },
  histSumVal: { fontSize: 14, fontWeight: '700' },

  amortRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  amortHead: { paddingVertical: 6 },
  amortHeadText: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 0.6, textTransform: 'uppercase' },
  amortCellN: { width: 82 },
  amortCell: { flex: 1, fontSize: 12, textAlign: 'right', fontVariant: ['tabular-nums'] },
  amortNum: { fontSize: 13, fontWeight: '700', color: colors.onDark },
  amortDate: { fontSize: 10, color: colors.onDarkMuted, marginTop: 1 },
  amortPaid: { backgroundColor: 'rgba(80, 160, 110, 0.10)' },
  extraChip: { fontSize: 10, fontWeight: '700', color: colors.green, marginTop: 2 },
  payNow: { fontSize: 11, fontWeight: '800', color: colors.goldBright, marginTop: 3 },
  savingsCard: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.green, backgroundColor: 'rgba(80, 160, 110, 0.12)', padding: spacing.md, marginBottom: spacing.md },
  savingsTitle: { fontSize: 13, fontWeight: '800', color: colors.green },
  savingsText: { fontSize: 13, color: colors.onDark, marginTop: 3, lineHeight: 19 },
  savingsSub: { fontSize: 11.5, color: colors.onDarkMuted, marginTop: 4, lineHeight: 17 },
  sugCard: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.bg, padding: spacing.md },
  sugTitle: { fontSize: 13, fontWeight: '800', color: colors.goldBright, marginBottom: 4 },
  sugText: { fontSize: 12.5, color: colors.onDark, lineHeight: 19 },
  sugBtn: { marginTop: spacing.sm, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.gold },
  sugBtnText: { fontSize: 12, fontWeight: '700', color: colors.goldBright },
  simNote: { fontSize: 12.5, lineHeight: 19, marginTop: spacing.sm },
  paymentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  payDate: { fontSize: 13, fontWeight: '600', color: colors.onDark },
  payCapital: { fontSize: 11, color: colors.green, fontWeight: '600' },
  payInteres: { fontSize: 11, color: colors.rust, fontWeight: '600' },
  payTotal: { fontSize: 15, fontWeight: '800', color: colors.gold },

  emptyHist: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyHistText: { fontSize: 13, color: colors.onDarkMuted, textAlign: 'center', lineHeight: 20 },
});
