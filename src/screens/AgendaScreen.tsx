import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthProvider';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { useScheduledExpenses } from '../hooks/useScheduledExpenses';
import { useDebtSchedule } from '../hooks/useDebtSchedule';
import { debtCalendarItems, debtDueAmount, debtUpcoming, type CalendarDebtItem } from '../lib/debtDates';
import { baseCurrency, formatCurrency, isCurrency } from '../lib/currency';
import { Glass } from '../components/brand/Glass';
import { GoldButton, GhostButton } from '../components/brand/Buttons';
import { Icon, type IconName } from '../components/brand/Icon';
import { Sheet } from '../components/budget/ui';
import { MonthCalendar, type DayMarks } from '../components/agenda/MonthCalendar';
import { EventForm } from '../components/agenda/EventForm';
import { PaymentForm } from '../components/agenda/PaymentForm';
import { PostponeSheet } from '../components/agenda/PostponeSheet';
import { useNotifications } from '../context/NotificationsProvider';
import {
  EVENT_ALERTS,
  PAYMENT_ALERT_DAYS,
  RECURRENCES,
  addDays,
  dueLabel,
  formatTime,
  occurrencesInRange,
  parseLocal,
  toISODate,
} from '../lib/reminders';
import { eventShareText, paymentShareText, shareViaWhatsApp } from '../lib/share';
import { fmtMoney } from '../lib/money';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { CalendarEventRow, CalendarEventType, ScheduledExpenseRow } from '../types/db';
import { dateLocale } from '../lib/i18n';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const TYPE_ICON: Record<CalendarEventType, IconName> = {
  cita: 'user',
  reunion: 'users',
  evento: 'star',
  recordatorio: 'bell',
};
const TYPE_LABEL: Record<CalendarEventType, string> = {
  cita: 'Cita',
  reunion: 'Reunión',
  evento: 'Evento',
  recordatorio: 'Recordatorio',
};

type DayItem =
  | { kind: 'evento'; key: string; date: string; sort: string; event: CalendarEventRow }
  | { kind: 'pago'; key: string; date: string; sort: string; expense: ScheduledExpenseRow }
  | { kind: 'deuda'; key: string; date: string; sort: string; item: CalendarDebtItem };

function longDate(d: string) {
  return parseLocal(d, '12:00').toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
}

export function AgendaScreen() {
  const navigation = useNavigation<NavProp>();
  const { householdId } = useAuth();
  const { events, loading, addEvent, updateEvent, deleteEvent } = useCalendarEvents(householdId);
  const { pending, loading: loadingPay, addExpense, postpone } = useScheduledExpenses(householdId);
  const { permission, enabled, askPermission } = useNotifications();
  const { items: debtItems, payments: debtPays, loading: loadingDebts } = useDebtSchedule(householdId);

  const today = toISODate(new Date());
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(today);

  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEventRow | null>(null);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [detail, setDetail] = useState<DayItem | null>(null);
  const [postponing, setPostponing] = useState<ScheduledExpenseRow | null>(null);

  const monthStart = toISODate(new Date(year, month, 1));
  const monthEnd = toISODate(new Date(year, month + 1, 0));

  // Eventos y pagos del mes visible, ya con las repeticiones expandidas
  const monthItems = useMemo<DayItem[]>(() => {
    const out: DayItem[] = [];
    for (const ev of events) {
      for (const date of occurrencesInRange(ev, monthStart, monthEnd)) {
        out.push({ kind: 'evento', key: `e-${ev.id}-${date}`, date, sort: `${date} ${ev.event_time ?? '00:00'}`, event: ev });
      }
    }
    for (const ex of pending) {
      if (ex.fecha_pago >= monthStart && ex.fecha_pago <= monthEnd) {
        out.push({ kind: 'pago', key: `p-${ex.id}`, date: ex.fecha_pago, sort: `${ex.fecha_pago} ${ex.hora_aviso ?? '09:00'}`, expense: ex });
      }
    }
    for (const it of debtCalendarItems(debtItems, debtPays, monthStart, monthEnd)) {
      out.push({ kind: 'deuda', key: `d-${it.type}-${it.debt.id}-${it.date}`, date: it.date, sort: `${it.date} ${it.type === 'pago' ? '09:00' : '08:00'}`, item: it });
    }
    return out;
  }, [events, pending, monthStart, monthEnd, debtItems, debtPays]);

  const marks = useMemo(() => {
    const m: Record<string, DayMarks> = {};
    for (const it of monthItems) {
      const cur = m[it.date] ?? { events: 0, payments: 0, overdue: false };
      if (it.kind === 'evento' || (it.kind === 'deuda' && it.item.type === 'corte')) cur.events += 1;
      else if (it.kind === 'deuda') {
        cur.payments += 1;
        if (it.item.overdue) cur.overdue = true;
      } else {
        cur.payments += 1;
        if (it.date < today) cur.overdue = true;
      }
      m[it.date] = cur;
    }
    return m;
  }, [monthItems, today]);

  const dayItems = monthItems.filter((i) => i.date === selected).sort((a, b) => a.sort.localeCompare(b.sort));

  // Lo que viene en los próximos 14 días (cruza meses) y pagos vencidos
  const soon = useMemo(() => {
    const to = addDays(today, 14);
    const out: DayItem[] = [];
    for (const ev of events) {
      for (const date of occurrencesInRange(ev, today, to)) {
        if (!ev.completado) out.push({ kind: 'evento', key: `e-${ev.id}-${date}`, date, sort: `${date} ${ev.event_time ?? '00:00'}`, event: ev });
      }
    }
    for (const ex of pending) {
      if (ex.fecha_pago <= to) out.push({ kind: 'pago', key: `p-${ex.id}`, date: ex.fecha_pago, sort: `${ex.fecha_pago} ${ex.hora_aviso ?? '09:00'}`, expense: ex });
    }
    for (const it of debtUpcoming(debtItems, debtPays, new Date(), 14)) {
      out.push({ kind: 'deuda', key: `d-${it.type}-${it.debt.id}-${it.date}`, date: it.date, sort: `${it.date} 09:00`, item: it });
    }
    return out.sort((a, b) => a.sort.localeCompare(b.sort));
  }, [events, pending, today, debtItems, debtPays]);

  function goToday() {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelected(toISODate(d));
  }

  function openNewEvent() {
    setEditing(null);
    setEventFormOpen(true);
  }

  async function onAvisoPress() {
    const p = await askPermission();
    if (p === 'denied') {
      Alert.alert('Avisos desactivados', 'Activa las notificaciones de Salomón en los ajustes de tu teléfono para recibir tus recordatorios.');
    }
  }

  function confirmDelete(ev: CalendarEventRow) {
    Alert.alert('Eliminar evento', `¿Eliminar "${ev.titulo}"${ev.recurrencia !== 'ninguna' ? ' y todas sus repeticiones' : ''}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteEvent(ev.id);
          if (error) Alert.alert('No se pudo eliminar', error);
          else setDetail(null);
        },
      },
    ]);
  }

  const busy = loading || loadingPay || loadingDebts;
  const needsPermission = enabled && (permission === 'undetermined' || permission === 'denied');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[colors.bgDeep, colors.bg]} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.actions}>
          <GoldButton small label="Nuevo evento" onPress={openNewEvent} style={{ flex: 1 }} />
          <GhostButton label="Pago pendiente" onPress={() => setPaymentFormOpen(true)} style={{ flex: 1, height: 44, borderRadius: 22 }} />
        </View>

        {needsPermission && (
          <Pressable onPress={onAvisoPress} style={styles.permCard} accessibilityLabel="Activar avisos">
            <Icon name="bell" size={20} color={colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.permTitle}>Activa los avisos</Text>
              <Text style={styles.permBody}>Para que Salomón te recuerde tus pagos y citas en la barra de notificaciones.</Text>
            </View>
            <Icon name="chevron" size={16} color={colors.onDarkMuted} />
          </Pressable>
        )}

        <Glass>
          <MonthCalendar
            year={year}
            month={month}
            selected={selected}
            marks={marks}
            onSelect={setSelected}
            onMonthChange={(y, m) => {
              setYear(y);
              setMonth(m);
            }}
          />
          {(year !== now.getFullYear() || month !== now.getMonth() || selected !== today) && (
            <Pressable onPress={goToday} style={styles.todayLink} accessibilityLabel="Ir a hoy">
              <Text style={styles.todayText}>Ir a hoy</Text>
            </Pressable>
          )}
        </Glass>

        {busy ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xl }} />
        ) : (
          <>
            <Text style={styles.section}>{longDate(selected).toUpperCase()}</Text>
            {dayItems.length === 0 ? (
              <View style={styles.emptyDay}>
                <Text style={styles.emptyText}>Nada programado este día.</Text>
                <Pressable onPress={openNewEvent} accessibilityLabel="Agregar evento en este día">
                  <Text style={styles.link}>+ Agregar un evento</Text>
                </Pressable>
              </View>
            ) : (
              dayItems.map((it) => <AgendaCard key={it.key} item={it} onPress={() => setDetail(it)} />)
            )}

            <Text style={styles.section}>PRÓXIMOS 14 DÍAS Y PAGOS VENCIDOS</Text>
            {soon.length === 0 ? (
              <Text style={styles.emptyText}>No tienes nada pendiente para los próximos días.</Text>
            ) : (
              soon.map((it) => <AgendaCard key={`s-${it.key}`} item={it} showDate onPress={() => setDetail(it)} />)
            )}
          </>
        )}
      </ScrollView>

      <EventForm
        visible={eventFormOpen}
        onClose={() => setEventFormOpen(false)}
        event={editing}
        defaultDate={selected < today ? today : selected}
        onSave={async (input, id) => (id ? updateEvent(id, input) : addEvent(input))}
      />

      <PaymentForm
        visible={paymentFormOpen}
        onClose={() => setPaymentFormOpen(false)}
        defaultDate={selected < today ? today : selected}
        onSave={addExpense}
      />

      <PostponeSheet
        visible={!!postponing}
        onClose={() => setPostponing(null)}
        title={postponing ? `${postponing.descripcion} · ¤ ${fmtMoney(Number(postponing.monto))}` : ''}
        currentDate={postponing?.fecha_pago ?? today}
        onConfirm={async (d) => {
          const res = await postpone(postponing!.id, d);
          if (!res.error) setDetail(null);
          return res;
        }}
      />

      <Sheet visible={!!detail && !eventFormOpen && !postponing} onClose={() => setDetail(null)} title={detail?.kind === 'pago' ? 'Pago pendiente' : detail?.kind === 'deuda' ? (detail.item.type === 'corte' ? 'Corte' : 'Pago de deuda') : 'Evento'}>
        {detail?.kind === 'evento' && (
          <EventDetail
            ev={detail.event}
            date={detail.date}
            onEdit={() => {
              setEditing(detail.event);
              setEventFormOpen(true);
            }}
            onDelete={() => confirmDelete(detail.event)}
            onDone={async () => {
              const res = await updateEvent(detail.event.id, { completado: !detail.event.completado });
              if (res.error) Alert.alert('No se pudo actualizar', res.error);
              else setDetail(null);
            }}
          />
        )}
        {detail?.kind === 'deuda' && (
          <DebtDetail
            item={detail.item}
            onOpen={() => {
              const isCard = detail.item.debt.id.startsWith('card:');
              setDetail(null);
              navigation.navigate(isCard ? 'Bancos' : 'Deudas');
            }}
          />
        )}
        {detail?.kind === 'pago' && (
          <PaymentDetail
            ex={detail.expense}
            onPay={() => {
              const id = detail.expense.id;
              setDetail(null);
              navigation.navigate('GastosProgramados', { payId: id });
            }}
            onPostpone={() => setPostponing(detail.expense)}
          />
        )}
      </Sheet>
    </SafeAreaView>
  );
}

function AgendaCard({ item, onPress, showDate }: { item: DayItem; onPress: () => void; showDate?: boolean }) {
  if (item.kind === 'deuda') {
    const { debt, type, paid, overdue, date } = item.item;
    const label = debt.tipo === 'tarjeta' ? 'tarjeta' : debt.tipo === 'prestamo' ? 'préstamo' : 'deuda';
    return (
      <Pressable onPress={onPress} style={[styles.card, overdue && styles.cardOverdue, paid && { opacity: 0.6 }]} accessibilityLabel={`${type === 'corte' ? 'Corte' : 'Pago'} de ${label} ${debt.nombre}`}>
        <View style={[styles.cardIcon, type === 'corte' ? { backgroundColor: colors.goldSoft, borderColor: colors.goldBorder } : overdue ? styles.iconOverdue : styles.iconPay]}>
          <Icon name={type === 'corte' ? 'bars' : 'card'} size={18} color={type === 'corte' ? colors.gold : overdue ? colors.rust : colors.neonCyan} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{type === 'corte' ? `Corte de ${label}` : `Pago de ${label}`}: {debt.nombre}</Text>
          <Text style={[styles.cardSub, overdue && { color: colors.rust, fontWeight: '700' }]} numberOfLines={1}>
            {showDate || overdue ? `${dueLabel(date)} · ` : ''}
            {type === 'corte' ? 'Cierra tu estado de cuenta' : paid ? 'Pagado' : Number(debt.cuota_mensual) > 0 ? `Cuota ${formatCurrency(Number(debt.cuota_mensual), isCurrency(debt.moneda) ? debt.moneda : baseCurrency(), { space: true })}` : 'Fecha límite de pago'}
          </Text>
        </View>
        {type === 'pago' && !paid && debt.aviso_dias_antes !== null && <Icon name="bell" size={15} color={colors.goldBright} />}
      </Pressable>
    );
  }
  if (item.kind === 'evento') {
    const ev = item.event;
    return (
      <Pressable onPress={onPress} style={[styles.card, ev.completado && { opacity: 0.55 }]} accessibilityLabel={`${ev.titulo}`}>
        <View style={[styles.cardIcon, { backgroundColor: colors.goldSoft, borderColor: colors.goldBorder }]}>
          <Icon name={TYPE_ICON[ev.tipo]} size={18} color={colors.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, ev.completado && styles.strike]} numberOfLines={1}>{ev.titulo}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>
            {showDate ? `${dueLabel(item.date)} · ` : ''}
            {ev.event_time ? formatTime(ev.event_time) : 'Todo el día'}
            {ev.lugar ? ` · ${ev.lugar}` : ''}
          </Text>
        </View>
        {ev.aviso_minutos !== null && <Icon name="bell" size={15} color={colors.goldBright} />}
        {ev.recurrencia !== 'ninguna' && <Icon name="refresh" size={15} color={colors.onDarkMuted} />}
      </Pressable>
    );
  }
  const ex = item.expense;
  const overdue = ex.fecha_pago < toISODate(new Date());
  return (
    <Pressable onPress={onPress} style={[styles.card, overdue && styles.cardOverdue]} accessibilityLabel={`Pago ${ex.descripcion}`}>
      <View style={[styles.cardIcon, overdue ? styles.iconOverdue : styles.iconPay]}>
        <Icon name="card" size={18} color={overdue ? colors.rust : colors.neonCyan} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{ex.descripcion}</Text>
        <Text style={[styles.cardSub, overdue && { color: colors.rust, fontWeight: '700' }]} numberOfLines={1}>
          {showDate || overdue ? `${dueLabel(item.date)} · ` : ''}Pago de ¤ {fmtMoney(Number(ex.monto))}
        </Text>
      </View>
      {ex.aviso_dias_antes !== null && <Icon name="bell" size={15} color={colors.goldBright} />}
      {ex.recurrencia !== 'ninguna' && <Icon name="refresh" size={15} color={colors.onDarkMuted} />}
    </Pressable>
  );
}

function DebtDetail({ item, onOpen }: { item: CalendarDebtItem; onOpen: () => void }) {
  const { debt, type, date, paid, overdue } = item;
  return (
    <>
      <Text style={styles.detailTitle}>{debt.nombre}</Text>
      {!!debtDueAmount(debt) && <Text style={styles.amount}>{formatCurrency(debtDueAmount(debt) as number, isCurrency(debt.moneda) ? debt.moneda : baseCurrency(), { space: true })}</Text>}
      <View style={{ gap: spacing.sm }}>
        <Row icon="calendar" text={`${type === 'corte' ? 'Corte' : 'Pago'}: ${longDate(date)} · ${dueLabel(date)}`} />
        {debt.dia_corte && <Row icon="bars" text={`Corte el día ${debt.dia_corte} de cada mes`} />}
        {debt.dia_pago && <Row icon="card" text={`Pago el día ${debt.dia_pago} de cada mes`} />}
        {debt.aviso_dias_antes !== null && <Row icon="bell" text={`Aviso ${debt.aviso_dias_antes === 0 ? 'el mismo día' : `${debt.aviso_dias_antes} día${debt.aviso_dias_antes !== 1 ? 's' : ''} antes`}`} />}
        {overdue && <Row icon="alert" text="Venció sin pago registrado" />}
        {paid && <Row icon="check" text="Ya registraste el pago de este ciclo" />}
      </View>
      <GoldButton small label={debt.id.startsWith('card:') ? 'Ver mis tarjetas' : 'Registrar pago'} onPress={onOpen} />
    </>
  );
}

function Row({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.detailRow}>
      <Icon name={icon} size={17} color={colors.gold} />
      <Text style={styles.detailText}>{text}</Text>
    </View>
  );
}

function EventDetail({ ev, date, onEdit, onDelete, onDone }: { ev: CalendarEventRow; date: string; onEdit: () => void; onDelete: () => void; onDone: () => void }) {
  const alert = EVENT_ALERTS.find((a) => a.minutes === ev.aviso_minutos)?.label ?? 'Sin aviso';
  const rec = RECURRENCES.find((r) => r.key === ev.recurrencia)?.label;
  return (
    <>
      <Text style={styles.detailTitle}>{ev.titulo}</Text>
      <View style={{ gap: spacing.sm }}>
        <Row icon={TYPE_ICON[ev.tipo]} text={TYPE_LABEL[ev.tipo]} />
        <Row icon="calendar" text={`${longDate(date)}${ev.event_time ? ` · ${formatTime(ev.event_time)}` : ' · todo el día'}`} />
        {!!ev.lugar && <Row icon="info" text={ev.lugar} />}
        <Row icon="bell" text={alert} />
        {ev.recurrencia !== 'ninguna' && <Row icon="refresh" text={rec ?? ''} />}
        {!!ev.notas && <Text style={styles.notes}>{ev.notas}</Text>}
      </View>
      <View style={styles.btnRow}>
        <GoldButton small label="Editar" onPress={onEdit} style={{ flex: 1 }} />
        {ev.recurrencia === 'ninguna' && (
          <GhostButton label={ev.completado ? 'Reabrir' : 'Marcar hecho'} onPress={onDone} style={{ flex: 1, height: 44, borderRadius: 22 }} />
        )}
      </View>
      <Pressable
        onPress={async () => {
          const ok = await shareViaWhatsApp(eventShareText(ev));
          if (!ok) Alert.alert('No se pudo abrir WhatsApp', 'Instala WhatsApp o inténtalo de nuevo.');
        }}
        style={styles.shareBtn}
        accessibilityLabel="Compartir por WhatsApp"
      >
        <Icon name="send" size={16} color={colors.goldBright} />
        <Text style={styles.shareText}>Compartir por WhatsApp</Text>
      </Pressable>
      <Pressable onPress={onDelete} style={{ alignItems: 'center', paddingVertical: 6 }} accessibilityLabel="Eliminar evento">
        <Text style={styles.delete}>Eliminar evento</Text>
      </Pressable>
    </>
  );
}

function PaymentDetail({ ex, onPay, onPostpone }: { ex: ScheduledExpenseRow; onPay: () => void; onPostpone: () => void }) {
  const alert = PAYMENT_ALERT_DAYS.find((a) => a.days === ex.aviso_dias_antes)?.label ?? 'Sin aviso';
  const rec = RECURRENCES.find((r) => r.key === ex.recurrencia)?.label;
  return (
    <>
      <Text style={styles.detailTitle}>{ex.descripcion}</Text>
      <Text style={styles.amount}>¤ {fmtMoney(Number(ex.monto))}</Text>
      <View style={{ gap: spacing.sm }}>
        <Row icon="calendar" text={`${longDate(ex.fecha_pago)} · ${dueLabel(ex.fecha_pago)}`} />
        <Row icon="bell" text={`${alert}${ex.aviso_dias_antes !== null ? ` · ${formatTime(ex.hora_aviso)}` : ''}`} />
        {ex.recurrencia !== 'ninguna' && <Row icon="refresh" text={rec ?? ''} />}
        {ex.pospuesto_veces > 0 && <Row icon="info" text={`Pospuesto ${ex.pospuesto_veces} vez${ex.pospuesto_veces !== 1 ? 'es' : ''}`} />}
      </View>
      <View style={styles.btnRow}>
        <GoldButton small label="Pagar ahora" onPress={onPay} style={{ flex: 1 }} />
        <GhostButton label="Posponer" onPress={onPostpone} style={{ flex: 1, height: 44, borderRadius: 22 }} />
      </View>
      <Pressable
        onPress={async () => {
          const ok = await shareViaWhatsApp(paymentShareText(ex));
          if (!ok) Alert.alert('No se pudo abrir WhatsApp', 'Instala WhatsApp o inténtalo de nuevo.');
        }}
        style={styles.shareBtn}
        accessibilityLabel="Compartir por WhatsApp"
      >
        <Icon name="send" size={16} color={colors.goldBright} />
        <Text style={styles.shareText}>Compartir por WhatsApp</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 130, gap: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' },

  actions: { flexDirection: 'row', gap: spacing.sm },

  permCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.goldBorder,
  },
  permTitle: { fontSize: 14, fontWeight: '700', color: colors.onDark },
  permBody: { fontSize: 12, color: colors.onDarkMuted, marginTop: 2, lineHeight: 17 },

  todayLink: { alignSelf: 'center', paddingVertical: 8, marginTop: 4 },
  todayText: { fontSize: 13, fontWeight: '700', color: colors.gold },

  section: { fontSize: 10, fontWeight: '700', color: colors.onDarkMuted, letterSpacing: 1.2, marginTop: spacing.md },
  emptyDay: { gap: 6 },
  emptyText: { fontSize: 13, color: colors.onDarkMuted },
  link: { fontSize: 13, fontWeight: '700', color: colors.gold },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder,
  },
  cardOverdue: { borderColor: 'rgba(255,143,122,0.5)' },
  cardIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  iconPay: { backgroundColor: colors.neonCyanSoft, borderColor: colors.neonCyanBorder },
  iconOverdue: { backgroundColor: 'rgba(255,143,122,0.14)', borderColor: 'rgba(255,143,122,0.45)' },
  cardTitle: { fontSize: 14.5, fontWeight: '700', color: colors.onDark },
  strike: { textDecorationLine: 'line-through' },
  cardSub: { fontSize: 12, color: colors.onDarkMuted, marginTop: 2 },

  detailTitle: { fontSize: 20, fontWeight: '700', color: colors.onDark },
  amount: { fontSize: 26, fontWeight: '800', color: colors.goldBright },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailText: { fontSize: 14, color: colors.onDark, flex: 1 },
  notes: { fontSize: 13, color: colors.onDarkMuted, lineHeight: 19, marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: spacing.sm },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.goldBorder, backgroundColor: colors.goldSoft,
  },
  shareText: { fontSize: 13.5, fontWeight: '700', color: colors.goldBright },
  delete: { fontSize: 13, fontWeight: '700', color: colors.rust },
});
