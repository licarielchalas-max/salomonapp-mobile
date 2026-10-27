import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { TextInput } from '../components/AppTextInput';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthProvider';
import { useAccounts } from '../hooks/useAccounts';
import { useBankAccounts } from '../hooks/useBankAccounts';
import { supabase } from '../lib/supabase';
import { accountCurrency, accountMoney, baseCash, fundsError, refKey, refOf, type AccountRef } from '../lib/money';
import { CURRENCIES, CURRENCY_LIST, convert, formatCurrency, numberText, parseAmount, rateLabel, round2, baseCurrency, getRates } from '../lib/currency';
import { useCurrency } from '../context/CurrencyProvider';
import { AccountPicker } from '../components/AccountPicker';
import { Glass } from '../components/brand/Glass';
import { GoldButton } from '../components/brand/Buttons';
import { Icon } from '../components/brand/Icon';
import { LedgerItem } from '../components/LedgerItem';
import { AccountHistorySheet } from '../components/AccountHistorySheet';
import { useLedger } from '../hooks/useLedger';
import { toLedgerItems } from '../lib/ledger';
import { Chip, FieldLabel, Sheet } from '../components/budget/ui';
import { colors, spacing, radius } from '../theme';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { AccountBalanceRow } from '../types/db';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// Cartera: todas tus cuentas con su saldo real, transferencias entre ellas y el libro de movimientos.
export function CarteraScreen() {
  const navigation = useNavigation<NavProp>();
  const { householdId } = useAuth();
  const { accounts, total, loading, reload: reloadBalances, find } = useAccounts(householdId);
  const { adjustBalance } = useBankAccounts(householdId);
  const { saveWalletOpening } = useCurrency();

  const { rows: ledgerRows, reload: loadLedger } = useLedger(householdId, { limit: 40 });
  const ledgerItems = toLedgerItems(ledgerRows, accounts).slice(0, 25);
  const [history, setHistory] = useState<AccountBalanceRow | null>(null);

  const refreshAll = () => { reloadBalances(); loadLedger(); };

  // Ajustar saldo
  const [adjust, setAdjust] = useState<AccountBalanceRow | null>(null);
  const [adjustInput, setAdjustInput] = useState('');
  const [savingAdjust, setSavingAdjust] = useState(false);

  async function saveAdjust() {
    if (!adjust || !householdId) return;
    const target = parseFloat(adjustInput.replace(/,/g, ''));
    if (isNaN(target) || target < 0) return Alert.alert('Saldo inválido', 'Ingresa un saldo de 0 o más.');
    setSavingAdjust(true);
    let error: string | null = null;
    if (adjust.kind === 'efectivo') {
      const cur = accountCurrency(adjust);
      const { data } = await supabase.from('households').select('wallet_initial_balance, wallet_extra').eq('id', householdId).maybeSingle();
      if (cur === 'DOP') {
        const nuevo = Number(data?.wallet_initial_balance ?? 0) + (target - adjust.saldo);
        const res = await supabase.from('households').update({ wallet_initial_balance: nuevo }).eq('id', householdId);
        error = res.error?.message ?? null;
      } else {
        const actual = Number((data?.wallet_extra as Record<string, number> | null)?.[cur] ?? 0);
        error = (await saveWalletOpening(cur, actual + (target - adjust.saldo))).error;
      }
    } else if (adjust.bank_account_id) {
      error = (await adjustBalance(adjust.bank_account_id, adjust.saldo, target)).error;
    }
    setSavingAdjust(false);
    if (error) return Alert.alert('No se pudo ajustar', error);
    setAdjust(null);
    refreshAll();
  }

  // Efectivo en otra moneda
  const [cashOpen, setCashOpen] = useState(false);
  const [cashCur, setCashCur] = useState<'USD' | 'EUR'>('USD');
  const [cashAmount, setCashAmount] = useState('');
  const [savingCash, setSavingCash] = useState(false);
  const missingCash = CURRENCY_LIST.filter(
    (c) => c.code !== 'DOP' && !accounts.some((a) => a.kind === 'efectivo' && accountCurrency(a) === c.code),
  );

  function openCash() {
    setCashCur((missingCash[0]?.code as 'USD' | 'EUR') ?? 'USD');
    setCashAmount('');
    setCashOpen(true);
  }

  async function saveCash() {
    const amount = cashAmount.trim() ? parseAmount(cashAmount) : 0;
    if (isNaN(amount) || amount < 0) return Alert.alert('Monto inválido', 'Escribe cuánto efectivo tienes hoy (0 si empiezas sin nada).');
    setSavingCash(true);
    const { error } = await saveWalletOpening(cashCur, amount);
    setSavingCash(false);
    if (error) return Alert.alert('No se pudo guardar', error);
    setCashOpen(false);
    refreshAll();
  }

  // Transferir
  const [transferOpen, setTransferOpen] = useState(false);
  const [from, setFrom] = useState<AccountRef | null>(baseCash());
  const [to, setTo] = useState<AccountRef | null>(null);
  const [tAmount, setTAmount] = useState('');
  const [tReceive, setTReceive] = useState('');
  const [tNote, setTNote] = useState('');
  const [savingTransfer, setSavingTransfer] = useState(false);

  function openTransfer() {
    setFrom(baseCash());
    setTo(null);
    setTAmount('');
    setTReceive('');
    setTNote('');
    setTransferOpen(true);
  }

  async function saveTransfer() {
    if (!householdId) return;
    const monto = parseFloat(tAmount.replace(/,/g, ''));
    if (!monto || monto <= 0) return Alert.alert('Monto inválido', 'Ingresa un monto mayor a 0.');
    if (!from || !to) return Alert.alert('Elige las cuentas', 'Indica de qué cuenta sale y a cuál entra el dinero.');
    const noFunds = fundsError(find(from), monto);
    if (noFunds) return Alert.alert('Sin fondos', noFunds);
    const fromCur = accountCurrency(find(from));
    const toCur = accountCurrency(find(to));
    // Entre monedas distintas: lo que recibe la cuenta de destino (sugerido con las tasas, editable).
    let destino: number | null = null;
    if (fromCur !== toCur) {
      destino = tReceive.trim() ? parseAmount(tReceive) : round2(convert(monto, fromCur, toCur));
      if (!destino || destino <= 0) return Alert.alert('Monto a recibir inválido', 'Escribe cuánto recibe la cuenta de destino.');
    }
    setSavingTransfer(true);
    const { error } = await supabase.from('account_transfers').insert({
      household_id: householdId,
      from_bank_account_id: from.kind === 'banco' ? from.id : null,
      to_bank_account_id: to.kind === 'banco' ? to.id : null,
      monto,
      ...(from.kind === 'efectivo' ? { from_moneda: fromCur } : {}),
      ...(to.kind === 'efectivo' ? { to_moneda: toCur } : {}),
      ...(destino !== null ? { monto_destino: destino } : {}),
      nota: tNote.trim() || null,
    });
    setSavingTransfer(false);
    if (error) return Alert.alert('No se pudo transferir', error.message);
    setTransferOpen(false);
    refreshAll();
  }

  const fromCur = accountCurrency(from ? find(from) : undefined);
  const toCur = accountCurrency(to ? find(to) : undefined);
  const crossCurrency = !!from && !!to && fromCur !== toCur;
  const tAmountNum = parseAmount(tAmount) || 0;
  const suggested = crossCurrency ? round2(convert(tAmountNum, fromCur, toCur)) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[colors.bgDeep, colors.bg]} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Glass highlight>
          <Text style={styles.kicker}>DINERO EN TUS CUENTAS</Text>
          {loading ? (
            <ActivityIndicator color={colors.gold} style={{ marginVertical: 12 }} />
          ) : (
            <Text style={[styles.total, total < 0 && { color: colors.rust }]}>{formatCurrency(total, baseCurrency(), { space: true })}</Text>
          )}
          <Text style={styles.totalNote}>
            Suma de efectivo y cuentas bancarias, con todos tus movimientos.
            {accounts.some((a) => accountCurrency(a) !== baseCurrency()) ? ' Las cuentas en otra moneda se convierten con tus tasas de cambio.' : ''}
          </Text>
        </Glass>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>CUENTAS</Text>
          {accounts.length > 1 && (
            <Pressable onPress={openTransfer} style={styles.linkBtn} accessibilityLabel="Transferir entre cuentas">
              <Icon name="refresh" size={14} color={colors.gold} strokeWidth={2.2} />
              <Text style={styles.linkText}>Transferir</Text>
            </Pressable>
          )}
        </View>

        {accounts.map((a) => (
          <Glass key={refKey(refOf(a))} style={{ marginBottom: spacing.md }}>
            <Pressable onPress={() => setHistory(a)} accessibilityLabel={`Ver movimientos de ${a.nombre}`} style={styles.accHead}>
              <View style={styles.accIcon}>
                <Icon name={a.kind === 'efectivo' ? 'coin' : 'bank'} size={20} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accName} numberOfLines={1}>{a.nombre}</Text>
                <Pressable
                  onPress={() => { setAdjust(a); setAdjustInput(String(a.saldo)); }}
                  hitSlop={6}
                  accessibilityLabel={`Ajustar saldo de ${a.nombre}`}
                >
                  <Text style={styles.adjustLink}>Ajustar saldo</Text>
                </Pressable>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.accSaldo, a.saldo < 0 && { color: colors.rust }]}>{accountMoney(a)}</Text>
                {accountCurrency(a) !== baseCurrency() && (
                  <Text style={styles.accApprox}>≈ {formatCurrency(convert(a.saldo, accountCurrency(a), baseCurrency()), baseCurrency(), { space: true })}</Text>
                )}
              </View>
            </Pressable>
          </Glass>
        ))}

        {missingCash.length > 0 && (
          <Pressable onPress={openCash} style={styles.addCash} accessibilityLabel="Agregar efectivo en otra moneda">
            <Icon name="plus" size={14} color={colors.gold} strokeWidth={2.4} />
            <Text style={styles.linkText}>Efectivo en otra moneda (US$ o €)</Text>
          </Pressable>
        )}

        {accounts.length === 1 && (
          <Pressable onPress={() => navigation.navigate('Bancos')} style={styles.hintCard}>
            <Icon name="bank" size={18} color={colors.goldBright} />
            <Text style={styles.hintText}>
              Registra tus cuentas bancarias en Bancos para llevar el saldo de cada una y pagar desde ellas.
            </Text>
          </Pressable>
        )}

        <View style={styles.quickRow}>
          <Pressable style={[styles.quickBtn, styles.quickOut]} onPress={() => navigation.navigate('AddTransaction', { defaultKind: 'gasto' })}>
            <Icon name="up" size={16} color={colors.rust} />
            <Text style={[styles.quickText, { color: colors.rust }]}>Registrar gasto</Text>
          </Pressable>
          <Pressable style={[styles.quickBtn, styles.quickIn]} onPress={() => navigation.navigate('AddTransaction', { defaultKind: 'ingreso' })}>
            <Icon name="down" size={16} color={colors.green} />
            <Text style={[styles.quickText, { color: colors.green }]}>Registrar ingreso</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl, marginBottom: spacing.md }]}>ÚLTIMOS MOVIMIENTOS DE DINERO</Text>
        {ledgerItems.length === 0 ? (
          <Text style={styles.empty}>Aún no hay movimientos con cuenta asignada.</Text>
        ) : (
          ledgerItems.map((item) => <LedgerItem key={item.key} item={item} />)
        )}
      </ScrollView>

      <AccountHistorySheet
        visible={!!history}
        onClose={() => setHistory(null)}
        householdId={householdId}
        account={history ? refOf(history) : null}
        accounts={accounts}
        nombre={history?.nombre ?? ''}
        saldo={history ? find(refOf(history))?.saldo ?? history.saldo : 0}
        moneda={history ? accountCurrency(history) : 'DOP'}
      />

      <Sheet visible={!!adjust} onClose={() => setAdjust(null)} title="Ajustar saldo">
        <Text style={styles.sheetHint}>
          Escribe cuánto dinero hay hoy en {adjust?.nombre}. Úsalo para registrar lo que ya tenías o corregir diferencias.
        </Text>
        <FieldLabel>{`Saldo real (${CURRENCIES[adjust ? accountCurrency(adjust) : 'DOP'].symbol})`}</FieldLabel>
        <TextInput
          style={styles.input}
          value={adjustInput}
          onChangeText={setAdjustInput}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.onDarkMuted}
          autoFocus
        />
        <GoldButton label="Guardar saldo" onPress={saveAdjust} loading={savingAdjust} />
      </Sheet>

      <Sheet visible={cashOpen} onClose={() => setCashOpen(false)} title="Efectivo en otra moneda">
        <Text style={styles.sheetHint}>
          Lleva por separado el efectivo en dólares o euros. Sus gastos e ingresos se guardan en esa moneda, sin mezclarse con tus pesos.
        </Text>
        <FieldLabel>Moneda</FieldLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {missingCash.map((c) => (
            <Chip key={c.code} label={`${c.symbol}  ${c.names.es}`} active={cashCur === c.code} onPress={() => setCashCur(c.code as 'USD' | 'EUR')} />
          ))}
        </View>
        <FieldLabel>{`¿Cuánto efectivo tienes hoy? (${CURRENCIES[cashCur].symbol})`}</FieldLabel>
        <TextInput
          style={styles.input}
          value={cashAmount}
          onChangeText={setCashAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.onDarkMuted}
          autoFocus
        />
        <GoldButton label="Agregar efectivo" onPress={saveCash} loading={savingCash} />
      </Sheet>

      <Sheet visible={transferOpen} onClose={() => setTransferOpen(false)} title="Transferir entre cuentas">
        <AccountPicker
          accounts={accounts}
          value={from}
          onChange={(r) => { setFrom(r); if (to && refKey(to) === refKey(r)) setTo(null); }}
          amount={parseFloat(tAmount.replace(/,/g, '')) || 0}
          label="¿De qué cuenta sale?"
        />
        <AccountPicker accounts={accounts} value={to} onChange={setTo} mode="entrada" exclude={from} label="¿A qué cuenta entra?" />
        <FieldLabel>{`Monto que sale (${CURRENCIES[fromCur].symbol})`}</FieldLabel>
        <TextInput
          style={styles.input}
          value={tAmount}
          onChangeText={(v) => { setTAmount(v); setTReceive(''); }}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.onDarkMuted}
        />
        {crossCurrency && (
          <>
            <FieldLabel>{`Monto que recibe (${CURRENCIES[toCur].symbol})`}</FieldLabel>
            <TextInput
              style={styles.input}
              value={tReceive}
              onChangeText={setTReceive}
              keyboardType="decimal-pad"
              placeholder={suggested ? numberText(suggested) : '0.00'}
              placeholderTextColor={colors.onDarkMuted}
              accessibilityLabel="Monto que recibe la cuenta de destino"
            />
            <Text style={styles.sheetHint}>
              Con tus tasas ({fromCur !== 'DOP' ? rateLabel(fromCur, getRates()) : rateLabel(toCur, getRates())}) recibiría {formatCurrency(suggested, toCur, { space: true })}. Si tu banco aplicó otra tasa, escribe el monto real.
            </Text>
          </>
        )}
        <FieldLabel>Nota (opcional)</FieldLabel>
        <TextInput
          style={styles.input}
          value={tNote}
          onChangeText={setTNote}
          placeholder="Ej. Retiro del cajero"
          placeholderTextColor={colors.onDarkMuted}
          maxLength={100}
        />
        <GoldButton label="Transferir" onPress={saveTransfer} loading={savingTransfer} />
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 130, maxWidth: 640, width: '100%', alignSelf: 'center' },

  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: colors.onDarkMuted },
  total: { fontSize: 32, fontWeight: '800', color: colors.goldBright, marginTop: 6 },
  totalNote: { fontSize: 12, color: colors.onDarkMuted, marginTop: spacing.sm, lineHeight: 17 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  linkText: { fontSize: 13, fontWeight: '700', color: colors.gold },
  addCash: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, marginBottom: spacing.sm },

  accHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  accIcon: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.goldBorder,
  },
  accName: { fontSize: 15, fontWeight: '700', color: colors.onDark },
  adjustLink: { fontSize: 12, fontWeight: '700', color: colors.gold, marginTop: 2 },
  accSaldo: { fontSize: 18, fontWeight: '800', color: colors.green },
  accApprox: { fontSize: 11, color: colors.onDarkMuted, marginTop: 1 },

  hintCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.goldBorder, marginBottom: spacing.md,
  },
  hintText: { flex: 1, fontSize: 12.5, color: colors.onDark, lineHeight: 18 },

  quickRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  quickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: radius.md, borderWidth: 1,
  },
  quickOut: { backgroundColor: 'rgba(255,143,122,0.12)', borderColor: 'rgba(255,143,122,0.4)' },
  quickIn: { backgroundColor: 'rgba(123,224,176,0.12)', borderColor: 'rgba(123,224,176,0.4)' },
  quickText: { fontSize: 13, fontWeight: '700' },

  empty: { fontSize: 13, color: colors.onDarkMuted },
  mov: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, marginBottom: spacing.sm,
    borderRadius: radius.md, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder,
  },
  movIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  movIn: { backgroundColor: 'rgba(123,224,176,0.16)' },
  movOut: { backgroundColor: 'rgba(255,143,122,0.16)' },
  movLabel: { fontSize: 13.5, fontWeight: '600', color: colors.onDark },
  movSub: { fontSize: 11, color: colors.onDarkMuted, marginTop: 2 },
  movAmt: { fontSize: 13.5, fontWeight: '700' },

  sheetHint: { fontSize: 13, color: colors.onDarkMuted, lineHeight: 19 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md, paddingVertical: 13, fontSize: 18, color: colors.onDark,
  },
});
