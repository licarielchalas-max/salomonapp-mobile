import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthProvider';
import { useScheduledExpenses } from '../hooks/useScheduledExpenses';
import { useAccounts } from '../hooks/useAccounts';
import { AccountPicker } from '../components/AccountPicker';
import { Glass } from '../components/brand/Glass';
import { GoldButton } from '../components/brand/Buttons';
import { Icon } from '../components/brand/Icon';
import { FieldLabel, Sheet } from '../components/budget/ui';
import { PaymentForm } from '../components/agenda/PaymentForm';
import { PostponeSheet } from '../components/agenda/PostponeSheet';
import { PaymentAlertChips, RecurrenceChips, TimeField } from '../components/agenda/Fields';
import { fundsErrorBase, fmtMoney, type AccountRef } from '../lib/money';
import { PAYMENT_ALERT_DAYS, RECURRENCES, dueLabel, formatTime, parseLocal, toISODate, trimTime } from '../lib/reminders';
import { shareViaWhatsApp } from '../lib/share';
import { paymentShareText } from '../lib/share';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { Recurrence, ScheduledExpenseRow } from '../types/db';
import { dateLocale } from '../lib/i18n';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function shortDate(d: string) {
  return parseLocal(d, '12:00').toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

export function GastosProgramadosScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'GastosProgramados'>>();
  const { householdId } = useAuth();
  const { pending, paid, loading, addExpense, updateExpense, markPaid, deleteExpense, postpone, updateReminder, totalPending } = useScheduledExpenses(householdId);
  const { accounts, find: findAccount, reload: reloadAccounts } = useAccounts(householdId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<ScheduledExpenseRow | null>(null);
  const [paying, setPaying] = useState<ScheduledExpenseRow | null>(null);
  const [payAccount, setPayAccount] = useState<AccountRef | null>(null);
  const [savingPay, setSavingPay] = useState(false);
  const [postponing, setPostponing] = useState<ScheduledExpenseRow | null>(null);
  const [editing, setEditing] = useState<ScheduledExpenseRow | null>(null);
  const [eAviso, setEAviso] = useState<number | null>(1);
  const [eHora, setEHora] = useState('09:00');
  const [eRec, setERec] = useState<Recurrence>('ninguna');

  // Llegar desde la agenda o un aviso con "Pagar": abre directo la ventana de pago
  const payId = route.params?.payId;
  useEffect(() => {
    if (!payId || loading) return;
    const target = pending.find((e) => e.id === payId);
    if (target) openPay(target);
    navigation.setParams({ payId: undefined });
  }, [payId, loading]);

  function openPay(exp: ScheduledExpenseRow) {
    setPayAccount(null);
    setPaying(exp);
  }

  async function confirmPay() {
    if (!paying) return;
    if (!payAccount) return Alert.alert('Elige una cuenta', 'Indica de qué cuenta sale el pago.');
    const noFunds = fundsErrorBase(findAccount(payAccount), Number(paying.monto));
    if (noFunds) return Alert.alert('Sin fondos', noFunds);
    setSavingPay(true);
    const { error } = await markPaid(paying.id, payAccount);
    setSavingPay(false);
    if (error) return Alert.alert('No se pudo pagar', error);
    const next = paying.recurrencia !== 'ninguna';
    setPaying(null);
    reloadAccounts();
    if (next) Alert.alert('Pago registrado', 'El siguiente pago ya quedó programado con su aviso.');
  }

  function confirmDelete(exp: ScheduledExpenseRow) {
    Alert.alert('Eliminar pago programado', `¿Eliminar "${exp.descripcion}"? Dejará de avisarte.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteExpense(exp.id) },
    ]);
  }

  function openReminder(exp: ScheduledExpenseRow) {
    setEAviso(exp.aviso_dias_antes);
    setEHora(trimTime(exp.hora_aviso) || '09:00');
    setERec(exp.recurrencia);
    setEditing(exp);
  }

  async function saveReminder() {
    if (!editing) return;
    const { error } = await updateReminder(editing.id, {
      aviso_dias_antes: eAviso,
      hora_aviso: eHora || '09:00',
      recurrencia: eRec,
    });
    if (error) return Alert.alert('No se pudo guardar', error);
    setEditing(null);
  }

  const today = toISODate(new Date());

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[colors.bgDeep, colors.bg]} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Glass highlight>
          <Text style={styles.kicker}>POR PAGAR</Text>
          <Text style={styles.total}>¤ {fmtMoney(totalPending)}</Text>
          <Text style={styles.count}>
            {pending.length} pago{pending.length !== 1 ? 's' : ''} pendiente{pending.length !== 1 ? 's' : ''}
          </Text>
        </Glass>

        {loading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 32 }} />
        ) : (
          <>
            {pending.length > 0 && <Text style={styles.section}>PENDIENTES</Text>}
            {pending.map((exp) => {
              const overdue = exp.fecha_pago < today;
              const urgent = overdue || exp.fecha_pago === today;
              const avisoLabel = PAYMENT_ALERT_DAYS.find((a) => a.days === exp.aviso_dias_antes)?.label;
              return (
                <Glass key={exp.id} warn={urgent} style={{ marginBottom: spacing.md }}>
                  <View style={styles.head}>
                    <View style={styles.iconWrap}>
                      <Icon name="card" size={20} color={urgent ? colors.rust : colors.gold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>{exp.descripcion}</Text>
                      <Text style={styles.sub}>{shortDate(exp.fecha_pago)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.amount}>¤ {fmtMoney(Number(exp.monto))}</Text>
                      <Text style={[styles.due, urgent && { color: colors.rust }]}>{dueLabel(exp.fecha_pago)}</Text>
                    </View>
                  </View>

                  <Pressable onPress={() => openReminder(exp)} style={styles.reminderRow} accessibilityLabel={`Cambiar aviso de ${exp.descripcion}`}>
                    <Icon name="bell" size={14} color={exp.aviso_dias_antes === null ? colors.onDarkMuted : colors.goldBright} />
                    <Text style={styles.reminderText} numberOfLines={1}>
                      {exp.aviso_dias_antes === null ? 'Sin aviso' : `${avisoLabel} · ${formatTime(exp.hora_aviso)}`}
                      {exp.recurrencia !== 'ninguna' ? ` · ${RECURRENCES.find((r) => r.key === exp.recurrencia)?.label}` : ''}
                    </Text>
                    <Text style={styles.reminderEdit}>Cambiar</Text>
                  </Pressable>

                  <View style={styles.btns}>
                    <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => openPay(exp)} accessibilityLabel={`Pagar ${exp.descripcion}`}>
                      <Icon name="check" size={15} color={colors.onNavy} strokeWidth={2.6} />
                      <Text style={styles.btnPrimaryText}>Pagar</Text>
                    </Pressable>
                    <Pressable style={styles.btn} onPress={() => setPostponing(exp)} accessibilityLabel={`Posponer ${exp.descripcion}`}>
                      <Icon name="calendar" size={15} color={colors.goldBright} />
                      <Text style={styles.btnText}>Posponer</Text>
                    </Pressable>
                    <Pressable
                      style={styles.btn}
                      onPress={async () => {
                        const ok = await shareViaWhatsApp(paymentShareText(exp));
                        if (!ok) Alert.alert('No se pudo abrir WhatsApp', 'Instala WhatsApp o inténtalo de nuevo.');
                      }}
                      accessibilityLabel={`Compartir ${exp.descripcion} por WhatsApp`}
                    >
                      <Icon name="send" size={15} color={colors.goldBright} />
                      <Text style={styles.btnText}>WhatsApp</Text>
                    </Pressable>
                  </View>
                  <View style={styles.linksRow}>
                    <Pressable onPress={() => { setEditingExp(exp); setFormOpen(true); }} accessibilityLabel={`Editar ${exp.descripcion}`}>
                      <Text style={styles.editLink}>Editar</Text>
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(exp)} accessibilityLabel={`Eliminar ${exp.descripcion}`}>
                      <Text style={styles.delete}>Eliminar</Text>
                    </Pressable>
                  </View>
                </Glass>
              );
            })}

            {paid.length > 0 && <Text style={[styles.section, { marginTop: spacing.lg }]}>PAGADOS</Text>}
            {paid.map((exp) => (
              <View key={exp.id} style={styles.paidCard}>
                <Icon name="check" size={18} color={colors.green} strokeWidth={2.4} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.paidName}>{exp.descripcion}</Text>
                  <Text style={styles.sub}>{shortDate(exp.fecha_pago)}</Text>
                </View>
                <Text style={styles.paidAmount}>¤ {fmtMoney(Number(exp.monto))}</Text>
              </View>
            ))}

            {pending.length === 0 && paid.length === 0 && (
              <Glass>
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Icon name="bell" size={28} color={colors.gold} />
                  </View>
                  <Text style={styles.emptyTitle}>Sin pagos programados</Text>
                  <Text style={styles.emptyDesc}>
                    Programa tarjetas, luz, agua, préstamos y otros pagos. Te avisamos antes de que venzan.
                  </Text>
                </View>
              </Glass>
            )}
          </>
        )}

        <GoldButton label="Programar pago" onPress={() => { setEditingExp(null); setFormOpen(true); }} style={{ marginTop: spacing.lg }} />
      </ScrollView>

      <PaymentForm
        visible={formOpen}
        onClose={() => { setFormOpen(false); setEditingExp(null); }}
        defaultDate={today}
        expense={editingExp}
        onSave={(input, id) => (id ? updateExpense(id, input) : addExpense(input))}
      />

      <PostponeSheet
        visible={!!postponing}
        onClose={() => setPostponing(null)}
        title={postponing ? `${postponing.descripcion} · ¤ ${fmtMoney(Number(postponing.monto))}` : ''}
        currentDate={postponing?.fecha_pago ?? today}
        onConfirm={(d) => postpone(postponing!.id, d)}
      />

      <Sheet visible={!!paying} onClose={() => setPaying(null)} title="Pagar">
        <Text style={styles.payWhat}>
          {paying?.descripcion} · ¤ {fmtMoney(Number(paying?.monto ?? 0))}
        </Text>
        <AccountPicker
          accounts={accounts}
          value={payAccount}
          onChange={setPayAccount}
          amount={Number(paying?.monto ?? 0)}
          amountBase
          label="¿De qué cuenta sale el pago?"
        />
        <GoldButton label="Confirmar pago" onPress={confirmPay} loading={savingPay} />
        {paying?.recurrencia !== 'ninguna' && (
          <Text style={styles.payHint}>Este pago se repite: al confirmarlo, el siguiente queda programado con su aviso.</Text>
        )}
      </Sheet>

      <Sheet visible={!!editing} onClose={() => setEditing(null)} title="Aviso del pago">
        <Text style={styles.payWhat}>{editing?.descripcion}</Text>
        <FieldLabel>¿Cuándo te avisamos?</FieldLabel>
        <PaymentAlertChips value={eAviso} onChange={setEAviso} />
        {eAviso !== null && (
          <>
            <FieldLabel>Hora del aviso</FieldLabel>
            <TimeField value={eHora} onChange={(v) => setEHora(v || '09:00')} />
          </>
        )}
        <FieldLabel>Repetir</FieldLabel>
        <RecurrenceChips value={eRec} onChange={setERec} />
        <GoldButton label="Guardar aviso" onPress={saveReminder} />
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 130, maxWidth: 640, width: '100%', alignSelf: 'center' },

  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: colors.onDarkMuted },
  total: { fontSize: 30, fontWeight: '800', color: colors.goldBright, marginTop: 6 },
  count: { fontSize: 12, color: colors.onDarkMuted, marginTop: 4 },

  section: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2, marginTop: spacing.xl, marginBottom: spacing.md },

  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.goldBorder,
  },
  name: { fontSize: 15.5, fontWeight: '700', color: colors.onDark },
  sub: { fontSize: 12, color: colors.onDarkMuted, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '800', color: colors.goldBright },
  due: { fontSize: 12, fontWeight: '600', color: colors.onDarkMuted, marginTop: 2 },

  reminderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md, paddingVertical: 9, paddingHorizontal: 12,
    borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  reminderText: { flex: 1, fontSize: 12.5, color: colors.onDark },
  reminderEdit: { fontSize: 12, fontWeight: '700', color: colors.gold },

  btns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11,
    borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(226,190,75,0.45)', backgroundColor: 'rgba(255,255,255,0.05)',
  },
  btnPrimary: { backgroundColor: colors.gold, borderColor: colors.gold, flex: 1.3 },
  btnText: { fontSize: 13, fontWeight: '700', color: colors.goldBright },
  btnPrimaryText: { fontSize: 13, fontWeight: '800', color: colors.onNavy },
  linksRow: { flexDirection: 'row', justifyContent: 'center', gap: 28, paddingTop: spacing.sm },
  editLink: { fontSize: 12.5, fontWeight: '700', color: colors.gold },
  delete: { fontSize: 12.5, fontWeight: '700', color: colors.rust },

  paidCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, marginBottom: spacing.sm,
    borderRadius: radius.md, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, opacity: 0.8,
  },
  paidName: { fontSize: 14, fontWeight: '600', color: colors.onDarkMuted },
  paidAmount: { fontSize: 13.5, fontWeight: '700', color: colors.onDarkMuted },

  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.goldBorder,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.goldBright },
  emptyDesc: { fontSize: 13, color: colors.onDarkMuted, textAlign: 'center', lineHeight: 19 },

  payWhat: { fontSize: 16, fontWeight: '700', color: colors.onDark },
  payHint: { fontSize: 12.5, color: colors.onDarkMuted, lineHeight: 18 },
});
