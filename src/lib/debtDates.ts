import { addDays, daysFromToday, dueLabel, parseLocal, toISODate, type AttentionItem, type PlannedReminder } from './reminders';
import { CURRENCIES, baseSymbol, isCurrency } from './currency';

// Fechas de corte y de pago de tarjetas y préstamos. Se guardan como "día del mes" (1–31);
// en los meses más cortos se usa el último día (pago el 31 → 28 de febrero).

export interface DebtDates {
  id: string;
  nombre: string;
  tipo: 'tarjeta' | 'prestamo' | 'otro';
  cuota_mensual: number;
  saldo: number;
  status?: string | null;
  dia_corte: number | null;
  dia_pago: number | null;
  aviso_dias_antes: number | null;
  /** Fecha de registro (ISO). Una deuda nueva no se marca vencida por fechas anteriores a ella. */
  created_at: string;
  /** Sin pagos que seguir (tarjeta sin deuda registrada): nunca se da por vencida. */
  untracked?: boolean;
  /** Moneda de la deuda; vacío = moneda base. */
  moneda?: string | null;
}

export interface DebtPaymentDate {
  debt_id: string;
  occurred_on: string;
}

/** Fecha de un día del mes, ajustada al largo del mes. */
export function dateForDay(year: number, month: number, day: number): string {
  const last = new Date(year, month + 1, 0).getDate();
  return toISODate(new Date(year, month, Math.min(Math.max(day, 1), last)));
}

/** Último vencimiento (hoy o antes) y próximo (hoy o después) de un día de pago. */
export function lastAndNextDue(day: number, now: Date = new Date()): { last: string; next: string } {
  const today = toISODate(now);
  const thisMonth = dateForDay(now.getFullYear(), now.getMonth(), day);
  if (thisMonth >= today) {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { last: dateForDay(prev.getFullYear(), prev.getMonth(), day), next: thisMonth };
  }
  const nextM = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { last: thisMonth, next: dateForDay(nextM.getFullYear(), nextM.getMonth(), day) };
}

/** Último corte que ocurre en o antes de `due`. */
export function cutBefore(cutDay: number, due: string): string {
  const d = parseLocal(due, '12:00');
  const inMonth = dateForDay(d.getFullYear(), d.getMonth(), cutDay);
  if (inMonth <= due) return inMonth;
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return dateForDay(prev.getFullYear(), prev.getMonth(), cutDay);
}

/** Desde cuándo un pago cuenta para el vencimiento `due`. */
export function paymentWindowStart(debt: Pick<DebtDates, 'dia_corte'>, due: string): string {
  return debt.dia_corte ? cutBefore(debt.dia_corte, due) : addDays(due, -25);
}

/** Próxima fecha de corte (hoy o después). */
export function nextCut(cutDay: number, now: Date = new Date()): string {
  return lastAndNextDue(cutDay, now).next;
}

export interface DebtCycle {
  last: string;
  next: string;
  lastPaid: boolean;
  /** Venció (antes de hoy) y no hay pago registrado para ese ciclo. */
  lastOverdue: boolean;
  nextPaid: boolean;
  nextCut: string | null;
  /** Días hasta el próximo pago (0 = hoy). */
  daysToNext: number;
}

export function isActiveDebt(d: Pick<DebtDates, 'status' | 'saldo'>): boolean {
  return d.status !== 'pagada' && Number(d.saldo) > 0;
}

/** Estado del ciclo de pago de una deuda con fecha de pago, o null si no tiene. */
export function debtCycle(debt: DebtDates, payments: DebtPaymentDate[], now: Date = new Date()): DebtCycle | null {
  if (!debt.dia_pago || !isActiveDebt(debt)) return null;
  const today = toISODate(now);
  const { last, next } = lastAndNextDue(debt.dia_pago, now);
  const mine = payments.filter((p) => p.debt_id === debt.id);
  const paidFor = (due: string) => {
    const from = paymentWindowStart(debt, due);
    return mine.some((p) => p.occurred_on >= from);
  };
  const created = debt.created_at.slice(0, 10);
  const lastPaid = paidFor(last);
  return {
    last,
    next,
    lastPaid,
    // Una deuda registrada después de ese vencimiento no se puede dar por vencida.
    lastOverdue: !debt.untracked && last < today && !lastPaid && created <= last,
    nextPaid: paidFor(next),
    nextCut: debt.dia_corte ? nextCut(debt.dia_corte, now) : null,
    daysToNext: daysFromToday(next, now),
  };
}

export function dayOfMonthLabel(day: number | null): string {
  return day ? `día ${day}` : '—';
}

/** Validación de un día del mes escrito por la persona. */
export function parseDay(v: string): number | null {
  const n = Number(v.trim());
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
}

// ── Avisos y pendientes ──────────────────────────────────────────────────────


/** Símbolo de la moneda de una deuda. */
function debtSymbol(d: Pick<DebtDates, 'moneda'>): string {
  return isCurrency(d.moneda) ? CURRENCIES[d.moneda].symbol : baseSymbol();
}

/** Lo que se avisa como monto: la cuota, o lo que se debe en una tarjeta sin cuota. */
export function debtDueAmount(d: Pick<DebtDates, 'cuota_mensual' | 'saldo' | 'tipo'>): number | undefined {
  if (Number(d.cuota_mensual) > 0) return Number(d.cuota_mensual);
  if (d.tipo === 'tarjeta' && Number(d.saldo) > 0) return Number(d.saldo);
  return undefined;
}

const TIPO_LABEL: Record<DebtDates['tipo'], string> = { tarjeta: 'tarjeta', prestamo: 'préstamo', otro: 'deuda' };

function money(n: number): string {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function at9(date: string): Date {
  return parseLocal(date, '09:00');
}

/** Avisos del teléfono para los pagos de tarjetas y préstamos: antes del vencimiento, el mismo día y, si se vence, cada día. */
export function debtReminders(debts: DebtDates[], payments: DebtPaymentDate[], now: Date = new Date()): PlannedReminder[] {
  const plan: PlannedReminder[] = [];
  for (const debt of debts) {
    const c = debtCycle(debt, payments, now);
    if (!c) continue;
    const label = TIPO_LABEL[debt.tipo];
    const due = debtDueAmount(debt);
    const amount = due ? ` · ${Number(debt.cuota_mensual) > 0 ? 'cuota' : 'debes'} ${debtSymbol(debt)} ${money(due)}` : '';
    const data = { kind: 'deuda' as const, id: debt.id };

    if (!c.nextPaid) {
      const before = debt.aviso_dias_antes;
      if (before !== null && before !== undefined && before > 0) {
        const when = at9(addDays(c.next, -before));
        if (when > now) {
          plan.push({
            key: `deuda:${debt.id}:${c.next}:antes`,
            at: when,
            title: `Pago de ${label}: ${debt.nombre}`,
            body: `Vence ${before === 1 ? 'mañana' : `en ${before} días`}${amount}`,
            data,
          });
        }
      }
      const dueDay = at9(c.next);
      if (dueDay > now) {
        plan.push({ key: `deuda:${debt.id}:${c.next}:hoy`, at: dueDay, title: `Hoy vence tu ${label}: ${debt.nombre}`, body: `Págala hoy para evitar cargos${amount}`, data });
      }
    }

    if (c.lastOverdue) {
      for (let i = 0; i < 3; i++) {
        const day = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i));
        const when = at9(day);
        if (when <= now || day === c.last) continue;
        plan.push({
          key: `deuda:${debt.id}:vencida:${day}`,
          at: when,
          title: `Pago vencido: ${debt.nombre}`,
          body: `Venció ${dueLabel(c.last, when).toLowerCase()}${amount}. Págalo cuanto antes.`,
          data,
        });
      }
    }
  }
  return plan;
}

/** Pagos de tarjetas y préstamos vencidos o próximos (por defecto, en 3 días). */
export function debtAttention(debts: DebtDates[], payments: DebtPaymentDate[], now: Date = new Date(), withinDays = 3): AttentionItem[] {
  const out: AttentionItem[] = [];
  for (const debt of debts) {
    const c = debtCycle(debt, payments, now);
    if (!c) continue;
    const label = debt.tipo === 'tarjeta' ? 'Tarjeta' : debt.tipo === 'prestamo' ? 'Préstamo' : 'Deuda';
    if (c.lastOverdue) {
      out.push({ kind: 'deuda', id: debt.id, title: `${label}: ${debt.nombre}`, subtitle: dueLabel(c.last, now), date: c.last, overdue: true, amount: debtDueAmount(debt), moneda: debt.moneda });
    } else if (!c.nextPaid && c.daysToNext <= withinDays) {
      out.push({ kind: 'deuda', id: debt.id, title: `${label}: ${debt.nombre}`, subtitle: dueLabel(c.next, now), date: c.next, overdue: false, amount: debtDueAmount(debt), moneda: debt.moneda });
    }
  }
  return out;
}

export interface CalendarDebtItem {
  debt: DebtDates;
  /** 'pago' = vencimiento; 'corte' = cierre del estado de cuenta. */
  type: 'pago' | 'corte';
  date: string;
  paid: boolean;
  overdue: boolean;
}

/** Fechas de pago y de corte de las deudas que caen dentro de [from, to]. */
export function debtCalendarItems(debts: DebtDates[], payments: DebtPaymentDate[], from: string, to: string, now: Date = new Date()): CalendarDebtItem[] {
  const out: CalendarDebtItem[] = [];
  const today = toISODate(now);
  const start = parseLocal(from, '12:00');
  const end = parseLocal(to, '12:00');
  for (const debt of debts) {
    if (!isActiveDebt(debt)) continue;
    const mine = payments.filter((p) => p.debt_id === debt.id);
    for (let m = new Date(start.getFullYear(), start.getMonth(), 1); m <= end; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
      if (debt.dia_pago) {
        const date = dateForDay(m.getFullYear(), m.getMonth(), debt.dia_pago);
        if (date >= from && date <= to) {
          const paid = mine.some((p) => p.occurred_on >= paymentWindowStart(debt, date));
          out.push({ debt, type: 'pago', date, paid, overdue: !debt.untracked && date < today && !paid && debt.created_at.slice(0, 10) <= date });
        }
      }
      if (debt.dia_corte) {
        const date = dateForDay(m.getFullYear(), m.getMonth(), debt.dia_corte);
        if (date >= from && date <= to) out.push({ debt, type: 'corte', date, paid: false, overdue: false });
      }
    }
  }
  return out;
}

// ── Tarjetas sin deuda registrada ────────────────────────────────────────────

export interface CardDates {
  id: string;
  banco: string;
  tipo: 'credito' | 'debito';
  nombre: string;
  ultimos4: string;
  dia_corte: number | null;
  dia_pago: number | null;
  aviso_dias_antes: number | null;
  created_at: string;
}

/**
 * Las tarjetas de crédito con fechas también avisan, aunque no tengan una deuda registrada.
 * Sin pagos que seguir, no se pueden dar por vencidas: solo avisan antes de la fecha.
 */
export function cardsAsDebtDates(cards: CardDates[], debts: Pick<DebtDates, 'id'>[] & { card_id?: string | null }[]): DebtDates[] {
  const linked = new Set((debts as { card_id?: string | null }[]).map((d) => d.card_id).filter(Boolean));
  return cards
    .filter((c) => c.tipo === 'credito' && c.dia_pago && !linked.has(c.id))
    .map((c) => ({
      id: `card:${c.id}`,
      nombre: `${c.nombre} ••••${c.ultimos4}`,
      tipo: 'tarjeta' as const,
      cuota_mensual: 0,
      saldo: 1,
      status: 'pendiente',
      dia_corte: c.dia_corte,
      dia_pago: c.dia_pago,
      aviso_dias_antes: c.aviso_dias_antes,
      created_at: c.created_at,
      untracked: true,
    }));
}

/** Pagos de deudas como entradas del factor "pagos a tiempo" del score (último ciclo de cada una). */
export function debtScoreEntries(debts: DebtDates[], payments: DebtPaymentDate[], now: Date = new Date()) {
  const out: { fecha_pago: string; status: 'pendiente' | 'pagado'; paid_on: string | null; pospuesto_veces: number }[] = [];
  for (const d of debts) {
    if (d.untracked) continue;
    const c = debtCycle(d, payments, now);
    if (!c) continue;
    const from = paymentWindowStart(d, c.last);
    const paid = payments.filter((p) => p.debt_id === d.id && p.occurred_on >= from).map((p) => p.occurred_on).sort()[0] ?? null;
    if (c.lastPaid) out.push({ fecha_pago: c.last, status: 'pagado', paid_on: paid, pospuesto_veces: 0 });
    else if (c.lastOverdue) out.push({ fecha_pago: c.last, status: 'pendiente', paid_on: null, pospuesto_veces: 0 });
  }
  return out;
}

/** Pagos que piden atención: el último vencimiento sin pagar y el próximo dentro de `days` días. */
export function debtUpcoming(debts: DebtDates[], payments: DebtPaymentDate[], now: Date = new Date(), days = 14): CalendarDebtItem[] {
  const out: CalendarDebtItem[] = [];
  for (const debt of debts) {
    const c = debtCycle(debt, payments, now);
    if (!c) continue;
    if (c.lastOverdue) out.push({ debt, type: 'pago', date: c.last, paid: false, overdue: true });
    if (!c.nextPaid && c.daysToNext <= days) out.push({ debt, type: 'pago', date: c.next, paid: false, overdue: false });
  }
  return out;
}
