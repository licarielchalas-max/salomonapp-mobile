import type { CalendarEventRow, CalendarEventType, Recurrence, ScheduledExpenseRow } from '../types/db';
import { baseSymbol } from './currency';
import { dateLocale, tr } from './i18n';

// Lógica de agenda y avisos, sin dependencias de pantalla ni de notificaciones:
// calcula cuándo avisar, qué decir y cuál es la próxima fecha de algo recurrente.

export const DEFAULT_ALERT_TIME = '09:00';

export const EVENT_TYPES: { key: CalendarEventType; label: string }[] = [
  { key: 'cita', label: 'Cita' },
  { key: 'reunion', label: 'Reunión' },
  { key: 'evento', label: 'Evento' },
  { key: 'recordatorio', label: 'Recordatorio' },
];

export const EVENT_ALERTS: { minutes: number | null; label: string }[] = [
  { minutes: null, label: 'Sin aviso' },
  { minutes: 0, label: 'A la hora' },
  { minutes: 10, label: '10 min antes' },
  { minutes: 30, label: '30 min antes' },
  { minutes: 60, label: '1 hora antes' },
  { minutes: 1440, label: '1 día antes' },
  { minutes: 2880, label: '2 días antes' },
];

export const PAYMENT_ALERT_DAYS: { days: number | null; label: string }[] = [
  { days: null, label: 'Sin aviso' },
  { days: 0, label: 'El mismo día' },
  { days: 1, label: '1 día antes' },
  { days: 2, label: '2 días antes' },
  { days: 3, label: '3 días antes' },
  { days: 7, label: '1 semana antes' },
];

export const RECURRENCES: { key: Recurrence; label: string }[] = [
  { key: 'ninguna', label: 'No se repite' },
  { key: 'semanal', label: 'Cada semana' },
  { key: 'mensual', label: 'Cada mes' },
  { key: 'anual', label: 'Cada año' },
];

/** Sugerencias para nombrar pagos que se repiten. */
export const PAYMENT_PRESETS = ['Tarjeta de crédito', 'Luz', 'Agua', 'Internet', 'Teléfono', 'Alquiler', 'Préstamo', 'Seguro', 'Suscripción'];

export const POSTPONE_OPTIONS: { days: number; label: string }[] = [
  { days: 1, label: 'Mañana' },
  { days: 3, label: 'En 3 días' },
  { days: 7, label: 'En 1 semana' },
];

// ── Fechas (siempre en hora local) ──────────────────────────────────────────

export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Combina "YYYY-MM-DD" y "HH:MM[:SS]" en una fecha local. */
export function parseLocal(dateStr: string, time: string | null | undefined = DEFAULT_ALERT_TIME): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = (time || DEFAULT_ALERT_TIME).split(':').map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
}

export function addDays(dateStr: string, days: number): string {
  const d = parseLocal(dateStr, '12:00');
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Próxima fecha de algo recurrente. En meses cortos se usa el último día (31 ene → 28 feb). */
export function nextOccurrence(dateStr: string, rule: Recurrence): string {
  if (rule === 'ninguna') return dateStr;
  if (rule === 'semanal') return addDays(dateStr, 7);
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = rule === 'mensual' ? 1 : 12;
  const target = new Date(y, m - 1 + months, 1, 12);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, last));
  return toISODate(target);
}

/** Texto corto de hora: "3:00 p. m." */
export function formatTime(time: string | null | undefined): string {
  if (!time) return '';
  const d = parseLocal('2000-01-01', time);
  return d.toLocaleTimeString(dateLocale(), { hour: 'numeric', minute: '2-digit' });
}

export function trimTime(time: string | null | undefined): string {
  return time ? time.slice(0, 5) : '';
}

/** Valida "HH:MM" (24 h). */
export function isValidTime(v: string): boolean {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(v.trim());
}

export function normalizeTime(v: string): string {
  const [h, m] = v.trim().split(':');
  return `${h.padStart(2, '0')}:${m}`;
}

export function daysFromToday(dateStr: string, now: Date = new Date()): number {
  const a = parseLocal(toISODate(now), '00:00').getTime();
  const b = parseLocal(dateStr, '00:00').getTime();
  return Math.round((b - a) / 86400000);
}

export function dueLabel(dateStr: string, now: Date = new Date()): string {
  const diff = daysFromToday(dateStr, now);
  if (diff < -1) return tr(`Vencido hace ${-diff} días`);
  if (diff === -1) return tr('Vencido ayer');
  if (diff === 0) return tr('Hoy');
  if (diff === 1) return tr('Mañana');
  if (diff < 8) return tr(`En ${diff} días`);
  return parseLocal(dateStr, '12:00').toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' });
}

/** Fechas en que ocurre un evento dentro de [from, to] (inclusive), contando las repeticiones. */
export function occurrencesInRange(
  ev: Pick<CalendarEventRow, 'event_date' | 'recurrencia'>,
  from: string,
  to: string,
): string[] {
  const out: string[] = [];
  let d = ev.event_date;
  for (let i = 0; i < 800 && d <= to; i++) {
    if (d >= from) out.push(d);
    if (ev.recurrencia === 'ninguna') break;
    d = nextOccurrence(d, ev.recurrencia);
  }
  return out;
}

// ── Cuándo avisar ────────────────────────────────────────────────────────────

/** Momento del aviso de un evento, o null si no tiene aviso. */
export function eventReminderDate(ev: Pick<CalendarEventRow, 'event_date' | 'event_time' | 'aviso_minutos'>): Date | null {
  if (ev.aviso_minutos === null || ev.aviso_minutos === undefined) return null;
  if (ev.event_time) {
    const start = parseLocal(ev.event_date, ev.event_time);
    return new Date(start.getTime() - ev.aviso_minutos * 60000);
  }
  // Evento de todo el día: se avisa a las 9:00, con los días de anticipación que correspondan.
  const base = parseLocal(ev.event_date, DEFAULT_ALERT_TIME);
  base.setDate(base.getDate() - Math.floor(ev.aviso_minutos / 1440));
  return base;
}

/** Momento del aviso de un pago pendiente, o null si no tiene aviso. */
export function paymentReminderDate(exp: Pick<ScheduledExpenseRow, 'fecha_pago' | 'hora_aviso' | 'aviso_dias_antes' | 'status'>): Date | null {
  if (exp.status !== 'pendiente' || exp.aviso_dias_antes === null || exp.aviso_dias_antes === undefined) return null;
  return parseLocal(addDays(exp.fecha_pago, -exp.aviso_dias_antes), exp.hora_aviso);
}

export type ReminderTone = 'sonido' | 'vibracion' | 'silencioso';

export interface PlannedReminder {
  /** Identificador estable: sirve para no duplicar y para cancelar. */
  key: string;
  at: Date;
  title: string;
  body: string;
  data: { kind: 'evento' | 'pago' | 'deuda' | 'resumen'; id: string };
}

function money(n: number): string {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function eventBody(ev: CalendarEventRow, now: Date): string {
  const when = daysFromToday(ev.event_date, now);
  const day = when === 0 ? 'Hoy' : when === 1 ? 'Mañana' : parseLocal(ev.event_date, '12:00').toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
  const parts = [ev.event_time ? `${day} a las ${formatTime(ev.event_time)}` : day];
  if (ev.lugar) parts.push(ev.lugar);
  return parts.join(' · ');
}

const EVENT_LABEL: Record<CalendarEventType, string> = {
  cita: 'Cita',
  reunion: 'Reunión',
  evento: 'Evento',
  recordatorio: 'Recordatorio',
};

/**
 * Lista de avisos futuros para programar en el teléfono.
 *  - Eventos con aviso (los recurrentes se expanden a las próximas apariciones).
 *  - Pagos pendientes con aviso, y un recordatorio diario mientras estén vencidos.
 * Se recorta a `limit` (iOS admite 64 pendientes como máximo).
 */
export function buildReminderPlan(
  events: CalendarEventRow[],
  expenses: ScheduledExpenseRow[],
  now: Date = new Date(),
  limit = 60,
): PlannedReminder[] {
  const plan: PlannedReminder[] = [];
  const horizon = new Date(now.getTime() + 120 * 86400000);

  for (const ev of events) {
    if (ev.completado || ev.aviso_minutos === null) continue;
    let date = ev.event_date;
    for (let i = 0; i < 40; i++) {
      const at = eventReminderDate({ ...ev, event_date: date });
      if (at && at > now && at <= horizon) {
        plan.push({
          key: `evento:${ev.id}:${date}`,
          at,
          title: `${EVENT_LABEL[ev.tipo] ?? 'Evento'}: ${ev.titulo}`,
          body: eventBody({ ...ev, event_date: date }, now),
          data: { kind: 'evento', id: ev.id },
        });
      }
      if (ev.recurrencia === 'ninguna') break;
      date = nextOccurrence(date, ev.recurrencia);
      if (parseLocal(date, '00:00') > horizon) break;
    }
  }

  for (const exp of expenses) {
    if (exp.status !== 'pendiente' || exp.aviso_dias_antes === null) continue;
    const at = paymentReminderDate(exp);
    if (at && at > now) {
      const diff = daysFromToday(exp.fecha_pago, now);
      const venc = diff <= 0 ? 'Vence hoy' : diff === 1 ? 'Vence mañana' : `Vence el ${parseLocal(exp.fecha_pago, '12:00').toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' })}`;
      plan.push({
        key: `pago:${exp.id}:${exp.fecha_pago}`,
        at,
        title: `Pago pendiente: ${exp.descripcion}`,
        body: `${venc} · ${baseSymbol()} ${money(Number(exp.monto))}`,
        data: { kind: 'pago', id: exp.id },
      });
    }
    // Vencido: un aviso por día durante los próximos 3 días, a la hora elegida.
    if (daysFromToday(exp.fecha_pago, now) <= 0) {
      for (let i = 0; i < 3; i++) {
        const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 0, 0, 0, 0);
        const dayStr = toISODate(base);
        const when = parseLocal(dayStr, exp.hora_aviso);
        if (when <= now || dayStr === exp.fecha_pago) continue;
        plan.push({
          key: `vencido:${exp.id}:${dayStr}`,
          at: when,
          title: `Pago vencido: ${exp.descripcion}`,
          body: `Venció ${dueLabel(exp.fecha_pago, when).toLowerCase()} · ${baseSymbol()} ${money(Number(exp.monto))}. Págalo o pospónlo.`,
          data: { kind: 'pago', id: exp.id },
        });
      }
    }
  }

  return plan.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, limit);
}

// ── Lo que pide atención hoy ─────────────────────────────────────────────────

export interface AttentionItem {
  kind: 'evento' | 'pago' | 'deuda';
  id: string;
  title: string;
  subtitle: string;
  date: string;
  overdue: boolean;
  amount?: number;
  /** Moneda del monto (vacío = moneda base). */
  moneda?: string | null;
}

/** Pagos vencidos o que vencen en `withinDays` días, y eventos de hoy. */
export function attentionItems(
  events: CalendarEventRow[],
  expenses: ScheduledExpenseRow[],
  now: Date = new Date(),
  withinDays = 3,
): AttentionItem[] {
  const out: AttentionItem[] = [];
  for (const exp of expenses) {
    if (exp.status !== 'pendiente') continue;
    const diff = daysFromToday(exp.fecha_pago, now);
    if (diff <= withinDays) {
      out.push({
        kind: 'pago',
        id: exp.id,
        title: exp.descripcion,
        subtitle: dueLabel(exp.fecha_pago, now),
        date: exp.fecha_pago,
        overdue: diff < 0,
        amount: Number(exp.monto),
      });
    }
  }
  for (const ev of events) {
    if (ev.completado) continue;
    if (daysFromToday(ev.event_date, now) === 0) {
      out.push({
        kind: 'evento',
        id: ev.id,
        title: ev.titulo,
        subtitle: ev.event_time ? `Hoy · ${formatTime(ev.event_time)}` : 'Hoy',
        date: ev.event_date,
        overdue: false,
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
