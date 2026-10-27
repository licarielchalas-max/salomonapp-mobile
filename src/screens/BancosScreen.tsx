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
import { useBankAccounts } from '../hooks/useBankAccounts';
import { useAccounts } from '../hooks/useAccounts';
import { accountMoney } from '../lib/money';
import { CURRENCIES, baseCurrency, formatCurrency, isCurrency, type CurrencyCode } from '../lib/currency';
import { CurrencyChips } from '../components/CurrencyChips';
import { AccountHistorySheet } from '../components/AccountHistorySheet';
import { DueDatesFields } from '../components/DueDatesFields';
import { lastAndNextDue, parseDay } from '../lib/debtDates';
import { dueLabel } from '../lib/reminders';
import { emitRemindersChanged } from '../lib/reminderBus';
import { colors, spacing, radius, shadow, glass } from '../theme';
import type { CardType } from '../types/db';

function fmt(n: number) {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const BANCOS_DO = ['Banco Popular', 'Banreservas', 'BHD León', 'Scotiabank', 'Banco Santa Cruz', 'Promerica', 'López de Haro', 'Caribe Express', 'Asociación Cibao', 'Asociación Popular', 'Reservas', 'Bancamérica'];

function BancoSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState('');
  const filtered = query.trim()
    ? BANCOS_DO.filter((b) => b.toLowerCase().includes(query.toLowerCase()))
    : BANCOS_DO;

  function selectBanco(b: string) {
    onChange(b);
    setQuery('');
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={searchStyles.searchWrap}>
        <Text style={searchStyles.searchIcon}>🔍</Text>
        <TextInput
          style={searchStyles.searchInput}
          value={query || value}
          onChangeText={(t) => { setQuery(t); onChange(t); }}
          placeholder="Buscar o escribir banco..."
          placeholderTextColor={colors.muted}
          returnKeyType="done"
        />
        {(query || value) ? (
          <Pressable onPress={() => { setQuery(''); onChange(''); }}>
            <Text style={searchStyles.clearBtn}>✕</Text>
          </Pressable>
        ) : null}
      </View>
      {filtered.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, paddingBottom: 4 }}>
            {filtered.map((b) => (
              <Pressable
                key={b}
                style={[searchStyles.chip, value === b && searchStyles.chipActive]}
                onPress={() => selectBanco(b)}
              >
                <Text style={[searchStyles.chipText, value === b && searchStyles.chipTextActive]}>{b}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const searchStyles = StyleSheet.create({
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: spacing.md, gap: spacing.sm },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: colors.onDark, paddingVertical: 12 },
  clearBtn: { fontSize: 14, color: colors.onDarkMuted, padding: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.bgCard },
  chipActive: { backgroundColor: colors.bgDeep, borderColor: colors.navy },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.onDarkMuted },
  chipTextActive: { color: colors.onDark },
});

type Tab = 'cuentas' | 'tarjetas';

export function BancosScreen() {
  const { householdId } = useAuth();
  const { accounts, cards, loading, addAccount, updateAccount, deleteAccount, adjustBalance, addCard, updateCard, deleteCard, reload: reloadBankAccounts } = useBankAccounts(householdId);
  const { accounts: balances, reload: reloadBalances } = useAccounts(householdId);
  const saldoOf = (id: string) => balances.find((b) => b.bank_account_id === id)?.saldo ?? 0;
  const monedaOf = (id: string): CurrencyCode => {
    const m = balances.find((b) => b.bank_account_id === id)?.moneda ?? accounts.find((a) => a.id === id)?.moneda;
    return isCurrency(m) ? m : 'DOP';
  };

  // Historial de una cuenta
  const [historyId, setHistoryId] = useState<string | null>(null);

  // Ajustar saldo
  const [adjusting, setAdjusting] = useState<{ id: string; banco: string } | null>(null);
  const [adjustInput, setAdjustInput] = useState('');
  const [tab, setTab] = useState<Tab>('cuentas');

  // Account modal
  const [showAccModal, setShowAccModal] = useState(false);
  const [accBanco, setAccBanco] = useState('');
  const [accUltimos4, setAccUltimos4] = useState('');
  const [accNumero, setAccNumero] = useState('');
  const [accSaldo, setAccSaldo] = useState('');
  const [accMoneda, setAccMoneda] = useState<CurrencyCode>(baseCurrency());
  const [editingAccId, setEditingAccId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Card modal
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardBanco, setCardBanco] = useState('');
  const [cardTipo, setCardTipo] = useState<CardType>('credito');
  const [cardNombre, setCardNombre] = useState('');
  const [cardUltimos4, setCardUltimos4] = useState('');
  const [cardLimite, setCardLimite] = useState('');
  const [cardCorte, setCardCorte] = useState('');
  const [cardPago, setCardPago] = useState('');
  const [cardAviso, setCardAviso] = useState<number | null>(3);
  const [cardSaldo, setCardSaldo] = useState('');
  const [cardMoneda, setCardMoneda] = useState<CurrencyCode>(baseCurrency());
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  function openNewAccount() {
    setEditingAccId(null);
    setAccBanco(''); setAccUltimos4(''); setAccNumero(''); setAccSaldo(''); setAccMoneda(baseCurrency());
    setShowAccModal(true);
  }

  function openEditAccount(acc: (typeof accounts)[number]) {
    setEditingAccId(acc.id);
    setAccBanco(acc.banco);
    setAccUltimos4(acc.ultimos4 ?? '');
    setAccNumero(acc.numero_cuenta ?? '');
    setAccSaldo('');
    setAccMoneda(isCurrency(acc.moneda) ? acc.moneda : 'DOP');
    setShowAccModal(true);
  }

  async function handleSaveAccount() {
    if (!accBanco.trim()) return Alert.alert('Falta banco', 'Selecciona o escribe el nombre del banco.');
    if (accUltimos4 && !/^\d{4}$/.test(accUltimos4)) return Alert.alert('Dígitos inválidos', 'Escribe exactamente 4 dígitos, o déjalo vacío.');
    if (editingAccId) {
      setSaving(true);
      const { error } = await updateAccount(editingAccId, { banco: accBanco.trim(), ultimos4: accUltimos4 || null, numero_cuenta: accNumero.trim() || null });
      setSaving(false);
      if (error) return Alert.alert('No se pudo guardar', error);
      setShowAccModal(false);
      setEditingAccId(null);
      reloadBalances();
      return;
    }
    const saldo = accSaldo.trim() ? parseFloat(accSaldo.replace(/,/g, '')) : 0;
    if (isNaN(saldo) || saldo < 0) return Alert.alert('Saldo inválido', 'Ingresa el dinero que tienes hoy en la cuenta (0 si está vacía).');
    setSaving(true);
    const { error } = await addAccount({ banco: accBanco.trim(), ultimos4: accUltimos4 || null, numero_cuenta: accNumero || null, saldo_inicial: saldo, moneda: accMoneda, status: 'desconectado', provider: 'manual' });
    setSaving(false);
    if (error) return Alert.alert('Error', error);
    setShowAccModal(false); setAccBanco(''); setAccUltimos4(''); setAccNumero(''); setAccSaldo(''); reloadBalances();
  }

  function openNewCard() {
    setEditingCardId(null);
    setCardBanco(''); setCardNombre(''); setCardUltimos4(''); setCardLimite(''); setCardCorte(''); setCardPago(''); setCardAviso(3); setCardSaldo(''); setCardTipo('credito'); setCardMoneda(baseCurrency());
    setShowCardModal(true);
  }

  function openEditCard(card: (typeof cards)[number]) {
    setEditingCardId(card.id);
    setCardTipo(card.tipo);
    setCardBanco(card.banco);
    setCardNombre(card.nombre);
    setCardUltimos4(card.ultimos4);
    setCardLimite(card.limite ? String(card.limite) : '');
    setCardSaldo(card.saldo_actual ? String(card.saldo_actual) : '');
    setCardCorte(card.dia_corte ? String(card.dia_corte) : '');
    setCardPago(card.dia_pago ? String(card.dia_pago) : '');
    setCardAviso(card.aviso_dias_antes);
    setCardMoneda(isCurrency(card.moneda) ? card.moneda : 'DOP');
    setShowCardModal(true);
  }

  async function handleSaveCard() {
    if (!cardBanco.trim() || !cardNombre.trim() || !/^\d{4}$/.test(cardUltimos4)) {
      return Alert.alert('Datos incompletos', 'Ingresa banco, nombre y los últimos 4 dígitos.');
    }
    const limite = cardLimite.trim() ? parseFloat(cardLimite.replace(/,/g, '')) : null;
    if (limite !== null && (isNaN(limite) || limite <= 0)) {
      return Alert.alert('Límite inválido', 'Escribe el límite de crédito como un monto mayor a 0, o déjalo vacío.');
    }
    const corte = parseDay(cardCorte);
    const pago = parseDay(cardPago);
    if (cardTipo === 'credito' && (!corte || !pago)) {
      return Alert.alert('Faltan las fechas', 'Una tarjeta de crédito necesita su día de corte y su día de pago (del 1 al 31) para avisarte cuándo pagar.');
    }
    const saldo = cardTipo === 'credito' && cardSaldo.trim() ? parseFloat(cardSaldo.replace(/,/g, '')) : 0;
    if (isNaN(saldo) || saldo < 0) {
      return Alert.alert('Saldo inválido', 'Escribe lo que debes hoy en la tarjeta (0 si no debes nada).');
    }
    const payload = {
      banco: cardBanco.trim(),
      tipo: cardTipo,
      nombre: cardNombre.trim(),
      ultimos4: cardUltimos4,
      moneda: cardMoneda,
      limite: cardTipo === 'credito' ? limite : null,
      saldo_actual: saldo,
      dia_corte: cardTipo === 'credito' ? corte : null,
      dia_pago: cardTipo === 'credito' ? pago : null,
      aviso_dias_antes: cardTipo === 'credito' ? cardAviso : null,
    };
    setSaving(true);
    const { error } = editingCardId ? await updateCard(editingCardId, payload) : await addCard(payload);
    setSaving(false);
    if (error) return Alert.alert('No se pudo guardar la tarjeta', error);
    setShowCardModal(false);
    setEditingCardId(null);
    setCardBanco(''); setCardNombre(''); setCardUltimos4(''); setCardLimite(''); setCardCorte(''); setCardPago(''); setCardAviso(3); setCardSaldo('');
    emitRemindersChanged();
  }

  function confirmDeleteAcc(id: string, banco: string) {
    Alert.alert('Eliminar cuenta', `¿Eliminar cuenta de ${banco}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteAccount(id);
          if (error) Alert.alert('No se pudo eliminar', error);
          else reloadBalances();
        },
      },
    ]);
  }

  function confirmDeleteCard(id: string, nombre: string) {
    Alert.alert('Eliminar tarjeta', `¿Eliminar tarjeta ${nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteCard(id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[colors.bgDeep, colors.bg]} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['cuentas', 'tarjetas'] as Tab[]).map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'cuentas' ? '🏦  Cuentas' : '💳  Tarjetas'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={colors.navy} style={{ marginTop: 40 }} />
        ) : tab === 'cuentas' ? (
          <>
            <Text style={styles.hint}>Registra tus cuentas bancarias para asociarlas a transferencias</Text>
            {accounts.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🏦</Text>
                <Text style={styles.emptyTitle}>Sin cuentas registradas</Text>
                <Text style={styles.emptyDesc}>Agrega tus cuentas para asociar transferencias</Text>
              </View>
            ) : (
              accounts.map((acc) => (
                <View key={acc.id} style={styles.accountCard}>
                  <View style={styles.accLeft}>
                    <Text style={styles.accIcon}>🏦</Text>
                    <View>
                      <Text style={styles.accBanco}>{acc.banco}</Text>
                      {acc.ultimos4 && <Text style={styles.accSub}>••••{acc.ultimos4}</Text>}
                      {acc.numero_cuenta && <Text style={styles.accSub}>{acc.numero_cuenta}</Text>}
                      <Text style={styles.accSaldo}>{formatCurrency(saldoOf(acc.id), monedaOf(acc.id), { space: true })}</Text>
                      <View style={{ flexDirection: 'row', gap: spacing.md }}>
                        <Pressable onPress={() => setHistoryId(acc.id)} hitSlop={6} accessibilityLabel={`Ver movimientos de ${acc.banco}`}>
                          <Text style={styles.adjustLink}>Ver movimientos</Text>
                        </Pressable>
                        <Pressable onPress={() => { setAdjusting({ id: acc.id, banco: acc.banco }); setAdjustInput(String(saldoOf(acc.id))); }} hitSlop={6}>
                          <Text style={styles.adjustLink}>Ajustar saldo</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                  <View style={styles.accRight}>
                    <View style={[styles.statusDot, { backgroundColor: acc.status === 'sincronizado' ? colors.green : colors.muted }]} />
                    <Pressable onPress={() => openEditAccount(acc)} accessibilityLabel={`Editar ${acc.banco}`} hitSlop={6}>
                      <Text style={styles.editText}>Editar</Text>
                    </Pressable>
                    <Pressable onPress={() => confirmDeleteAcc(acc.id, acc.banco)} accessibilityLabel={`Eliminar ${acc.banco}`} hitSlop={6}>
                      <Text style={styles.deleteText}>✕</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
            <Pressable style={styles.addBtn} onPress={openNewAccount}>
              <Text style={styles.addBtnText}>+ Agregar Cuenta</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.hint}>Registra tus tarjetas para asociarlas a pagos con tarjeta</Text>
            {cards.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>💳</Text>
                <Text style={styles.emptyTitle}>Sin tarjetas registradas</Text>
                <Text style={styles.emptyDesc}>Agrega tus tarjetas para identificar pagos</Text>
              </View>
            ) : (
              cards.map((card) => (
                <View key={card.id} style={[styles.cardCard, { borderLeftColor: card.tipo === 'credito' ? colors.rust : colors.green }]}>
                  <View style={styles.accLeft}>
                    <Text style={styles.accIcon}>💳</Text>
                    <View>
                      <Text style={styles.accBanco}>{card.nombre}</Text>
                      <Text style={styles.accSub}>{card.banco} · ••••{card.ultimos4}</Text>
                      <Text style={[styles.cardTipoBadge, { color: card.tipo === 'credito' ? colors.rust : colors.green }]}>
                        {card.tipo === 'credito' ? 'Crédito' : 'Débito'}
                        {card.limite ? ` · Límite ${formatCurrency(card.limite, card.moneda)}` : ''}
                      </Text>
                      {card.tipo === 'credito' && !!card.limite && (
                        <>
                          <Text style={styles.cardDebt}>
                            Debes {formatCurrency(Number(card.saldo_actual), card.moneda)} · Disponible {formatCurrency(Math.max(0, Number(card.limite) - Number(card.saldo_actual)), card.moneda)}
                          </Text>
                          <View style={styles.useTrack}>
                            <View style={[styles.useFill, { width: `${Math.min(100, (Number(card.saldo_actual) / Number(card.limite)) * 100)}%`, backgroundColor: Number(card.saldo_actual) / Number(card.limite) > 0.8 ? colors.rust : Number(card.saldo_actual) / Number(card.limite) > 0.5 ? colors.neonAmber : colors.green }]} />
                          </View>
                        </>
                      )}
                      {card.tipo === 'credito' && !card.limite && Number(card.saldo_actual) > 0 && (
                        <Text style={styles.cardDebt}>Debes {formatCurrency(Number(card.saldo_actual), card.moneda)}</Text>
                      )}
                      {card.tipo === 'credito' && card.dia_pago && (
                        <Text style={styles.cardDates}>
                          Corte día {card.dia_corte} · Pago día {card.dia_pago} · {dueLabel(lastAndNextDue(card.dia_pago).next).toLowerCase()}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.accRight}>
                    <Pressable onPress={() => openEditCard(card)} accessibilityLabel={`Editar ${card.nombre}`} hitSlop={6}>
                      <Text style={styles.editText}>Editar</Text>
                    </Pressable>
                    <Pressable onPress={() => confirmDeleteCard(card.id, card.nombre)} accessibilityLabel={`Eliminar ${card.nombre}`} hitSlop={6}>
                      <Text style={styles.deleteText}>✕</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
            <Pressable style={styles.addBtn} onPress={openNewCard}>
              <Text style={styles.addBtnText}>+ Agregar Tarjeta</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Add Account Modal */}
      <Sheet visible={showAccModal} onClose={() => setShowAccModal(false)} title={editingAccId ? 'Editar cuenta' : 'Nueva cuenta bancaria'}>
<Text style={styles.modalLabel}>BANCO</Text>
            <BancoSelector value={accBanco} onChange={setAccBanco} />

            <Text style={styles.modalLabel}>MONEDA DE LA CUENTA</Text>
            <CurrencyChips
              value={accMoneda}
              onChange={setAccMoneda}
              locked={!!editingAccId}
              lockedNote="La moneda no se cambia después de crear la cuenta. Para usar otra, registra una cuenta nueva."
            />

            <Text style={styles.modalLabel}>ÚLTIMOS 4 DÍGITOS (opcional)</Text>
            <TextInput style={styles.input} value={accUltimos4} onChangeText={setAccUltimos4} placeholder="1234" placeholderTextColor={colors.muted} keyboardType="number-pad" maxLength={4} />

            <Text style={styles.modalLabel}>NÚMERO DE CUENTA (opcional)</Text>
            <TextInput style={styles.input} value={accNumero} onChangeText={setAccNumero} placeholder="Ej: 1234567890" placeholderTextColor={colors.muted} />

            {editingAccId ? (
              <Text style={styles.hint}>Para corregir el saldo usa "Ajustar saldo" en la lista de cuentas.</Text>
            ) : (
              <>
                <Text style={styles.modalLabel}>{`¿CUÁNTO DINERO TIENES HOY EN ESTA CUENTA? (${CURRENCIES[accMoneda].symbol})`}</Text>
                <TextInput style={styles.input} value={accSaldo} onChangeText={setAccSaldo} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" />
              </>
            )}

            <Pressable style={styles.saveBtn} onPress={handleSaveAccount} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
            </Pressable>
      </Sheet>

      <AccountHistorySheet
        visible={!!historyId}
        onClose={() => setHistoryId(null)}
        householdId={householdId}
        account={historyId ? { kind: 'banco', id: historyId } : null}
        accounts={balances}
        nombre={accounts.find((a) => a.id === historyId)?.banco ?? ''}
        saldo={historyId ? saldoOf(historyId) : 0}
        moneda={historyId ? monedaOf(historyId) : 'DOP'}
      />

      {/* Ajustar saldo */}
      <Sheet visible={!!adjusting} onClose={() => setAdjusting(null)} title="Ajustar saldo">
<Text style={styles.hint}>
              Escribe cuánto dinero hay hoy en {adjusting?.banco}. Úsalo para corregir diferencias con tu estado de cuenta.
            </Text>
            <Text style={styles.modalLabel}>{`SALDO REAL (${CURRENCIES[adjusting ? monedaOf(adjusting.id) : 'DOP'].symbol})`}</Text>
            <TextInput style={styles.input} value={adjustInput} onChangeText={setAdjustInput} keyboardType="decimal-pad" autoFocus placeholder="0.00" placeholderTextColor={colors.muted} />
            <Pressable
              style={styles.saveBtn}
              onPress={async () => {
                if (!adjusting) return;
                const target = parseFloat(adjustInput.replace(/,/g, ''));
                if (isNaN(target) || target < 0) return Alert.alert('Saldo inválido', 'Ingresa un saldo de 0 o más.');
                const { error } = await adjustBalance(adjusting.id, saldoOf(adjusting.id), target);
                if (error) return Alert.alert('No se pudo ajustar', error);
                setAdjusting(null);
                reloadBalances();
              }}
            >
              <Text style={styles.saveBtnText}>Guardar saldo</Text>
            </Pressable>
      </Sheet>

      {/* Add Card Modal */}
      <Sheet visible={showCardModal} onClose={() => setShowCardModal(false)} title={editingCardId ? 'Editar tarjeta' : 'Nueva tarjeta'}>
<Text style={styles.modalLabel}>TIPO</Text>
            <View style={styles.tipoRow}>
              {(['credito', 'debito'] as CardType[]).map((t) => (
                <Pressable key={t} style={[styles.tipoBtn, cardTipo === t && styles.tipoBtnActive]} onPress={() => setCardTipo(t)}>
                  <Text style={[styles.tipoBtnText, cardTipo === t && styles.tipoBtnTextActive]}>
                    {t === 'credito' ? 'Crédito' : 'Débito'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>MONEDA DE LA TARJETA</Text>
            <CurrencyChips
              value={cardMoneda}
              onChange={setCardMoneda}
              locked={!!editingCardId}
              lockedNote="La moneda no se cambia después de crear la tarjeta. Para usar otra, registra una tarjeta nueva."
            />

            <Text style={styles.modalLabel}>BANCO</Text>
            <BancoSelector value={cardBanco} onChange={setCardBanco} />

            <Text style={styles.modalLabel}>NOMBRE DE LA TARJETA</Text>
            <TextInput style={styles.input} value={cardNombre} onChangeText={setCardNombre} placeholder="Ej: Visa Oro, MC Platinum..." placeholderTextColor={colors.muted} />

            <Text style={styles.modalLabel}>ÚLTIMOS 4 DÍGITOS</Text>
            <TextInput style={styles.input} value={cardUltimos4} onChangeText={setCardUltimos4} placeholder="1234" placeholderTextColor={colors.muted} keyboardType="number-pad" maxLength={4} />

            {cardTipo === 'credito' && (
              <>
                <Text style={styles.modalLabel}>{`LÍMITE DE CRÉDITO (${CURRENCIES[cardMoneda].symbol}, opcional)`}</Text>
                <TextInput style={styles.input} value={cardLimite} onChangeText={setCardLimite} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" />

                <Text style={styles.modalLabel}>{`LO QUE DEBES HOY EN ESTA TARJETA (${CURRENCIES[cardMoneda].symbol})`}</Text>
                <TextInput style={styles.input} value={cardSaldo} onChangeText={setCardSaldo} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" accessibilityLabel="Saldo adeudado" />
                {!!cardLimite && !isNaN(parseFloat(cardSaldo)) && parseFloat(cardLimite) > 0 && (
                  <Text style={styles.hint}>
                    Disponible: {formatCurrency(Math.max(0, parseFloat(cardLimite.replace(/,/g, '')) - parseFloat(cardSaldo.replace(/,/g, ''))), cardMoneda)}
                  </Text>
                )}

                <DueDatesFields
                  showCorte
                  corte={cardCorte}
                  pago={cardPago}
                  aviso={cardAviso}
                  onCorte={setCardCorte}
                  onPago={setCardPago}
                  onAviso={setCardAviso}
                />
              </>
            )}

            <Pressable style={styles.saveBtn} onPress={handleSaveCard} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{editingCardId ? 'Guardar cambios' : 'Guardar Tarjeta'}</Text>}
            </Pressable>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  tabRow: { flexDirection: 'row', backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.navy },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.onDarkMuted },
  tabTextActive: { color: colors.gold },
  content: { padding: spacing.lg, paddingBottom: 130 },
  hint: { fontSize: 12, color: colors.onDarkMuted, marginBottom: spacing.md, textAlign: 'center' },
  emptyCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.xxl, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder, gap: spacing.sm, marginBottom: spacing.lg },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.gold },
  emptyDesc: { fontSize: 13, color: colors.onDarkMuted, textAlign: 'center' },
  accountCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadow.card },
  cardCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder, borderLeftWidth: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadow.card },
  accLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  accIcon: { fontSize: 24 },
  accBanco: { fontSize: 14, fontWeight: '700', color: colors.onDark, marginBottom: 2 },
  cardDates: { fontSize: 11.5, color: colors.goldBright, marginTop: 2 },
  editText: { fontSize: 12.5, fontWeight: '700', color: colors.gold },
  cardDebt: { fontSize: 12, fontWeight: '700', color: colors.onDark, marginTop: 3 },
  useTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', marginTop: 4, width: 190 },
  useFill: { height: '100%', borderRadius: 3 },
  accSaldo: { fontSize: 15, fontWeight: '800', color: colors.goldBright, marginTop: 4 },
  adjustLink: { fontSize: 12, fontWeight: '700', color: colors.gold, marginTop: 2 },
  accSub: { fontSize: 11, color: colors.onDarkMuted },
  cardTipoBadge: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  accRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  deleteText: { fontSize: 16, color: colors.onDarkMuted, padding: 4 },
  addBtn: { backgroundColor: colors.bgDeep, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: spacing.sm },
  addBtnText: { fontSize: 15, fontWeight: '700', color: colors.onDark },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xxl, gap: spacing.md },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.gold, marginBottom: spacing.sm },
  modalLabel: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2 },
  input: { backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: spacing.md, paddingVertical: 13, fontSize: 14, color: colors.onDark },
  tipoRow: { flexDirection: 'row', gap: spacing.md },
  tipoBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.glassBorder, alignItems: 'center', backgroundColor: colors.bg },
  tipoBtnActive: { backgroundColor: colors.bgDeep, borderColor: colors.navy },
  tipoBtnText: { fontSize: 13, fontWeight: '700', color: colors.onDarkMuted },
  tipoBtnTextActive: { color: colors.onDark },
  saveBtn: { backgroundColor: colors.bgDeep, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: spacing.sm },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.onDark },
});
