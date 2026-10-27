// Resumen del día: cómo vas hoy y en el mes, qué ajustar y qué viene mañana.
// Es lógica pura (sin pantallas ni red) para poder probarla. Los textos usan "¤" como símbolo de la moneda base.

export interface DayTx {
  kind: 'gasto' | 'ingreso';
  /** Monto ya convertido a la moneda base. */
  amount: number;
  /** YYYY-MM-DD */
  occurred_on: string;
}

export interface DayBudget {
  nombre: string;
  monto: number;
  gastado: number;
}

export interface DayUpcoming {
  title: string;
  /** YYYY-MM-DD */
  date: string;
  overdue?: boolean;
  amount?: number;
}

export interface DaySummaryInput {
  now: Date;
  /** Movimientos del mes en curso. */
  transactions: DayTx[];
  budgets: DayBudget[];
  upcoming: DayUpcoming[];
}

export type DayTone = 'good' | 'warn' | 'nudge';

export interface DaySummary {
  tone: DayTone;
  title: string;
  lines: string[];
  /** Días seguidos (hasta hoy o ayer) con al menos un movimiento registrado. */
  streak: number;
  /** Frase de cierre para motivar. */
  closing: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const money = (n: number) => n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CLOSINGS = [
  'Cada gasto anotado es una decisión más clara.',
  'Lo que se mide, se mejora.',
  'Pequeños hábitos, grandes resultados.',
  'Tu yo de mañana te lo agradece.',
  'Con orden, el dinero rinde más.',
  'Anotar hoy es ganar tranquilidad mañana.',
  'La constancia vale más que la perfección.',
];

/** Días seguidos con movimientos, contando hacia atrás desde hoy (o desde ayer si hoy aún no hay). */
export function loggingStreak(transactions: DayTx[], now: Date): number {
  const days = new Set(transactions.map((t) => t.occurred_on));
  const cur = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(isoDay(cur))) cur.setDate(cur.getDate() - 1);
  let n = 0;
  while (days.has(isoDay(cur))) {
    n++;
    cur.setDate(cur.getDate() - 1);
  }
  return n;
}

export function daySummary(input: DaySummaryInput): DaySummary {
  const { now, transactions, budgets, upcoming } = input;
  const today = isoDay(now);
  const tomorrow = isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));

  const todays = transactions.filter((t) => t.occurred_on === today);
  const spentToday = todays.filter((t) => t.kind === 'gasto').reduce((s, t) => s + t.amount, 0);
  const earnedToday = todays.filter((t) => t.kind === 'ingreso').reduce((s, t) => s + t.amount, 0);
  const income = transactions.filter((t) => t.kind === 'ingreso').reduce((s, t) => s + t.amount, 0);
  const spent = transactions.filter((t) => t.kind === 'gasto').reduce((s, t) => s + t.amount, 0);
  const streak = loggingStreak(transactions, now);

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthPct = Math.round((now.getDate() / daysInMonth) * 100);
  const usedPct = income > 0 ? Math.round((spent / income) * 100) : null;

  const lines: string[] = [];
  let tone: DayTone = 'good';

  if (todays.length === 0) {
    tone = 'nudge';
    lines.push('Hoy no has registrado movimientos. Si gastaste o te entró dinero, anótalo para que tus números sean reales.');
  } else {
    lines.push(`Movimientos de hoy: ${todays.length} · gastos ¤${money(spentToday)} · ingresos ¤${money(earnedToday)}`);
  }

  if (usedPct !== null) {
    if (usedPct <= monthPct + 5) {
      lines.push(`Vas bien: has usado el ${usedPct}% de tus ingresos y el mes va por el ${monthPct}%.`);
    } else {
      if (tone === 'good') tone = 'warn';
      lines.push(`Ajuste sugerido: has usado el ${usedPct}% de tus ingresos y el mes va por el ${monthPct}%. Frena los gastos no esenciales.`);
    }
  } else if (spent > 0) {
    lines.push('Registra tus ingresos del mes para saber qué porcentaje llevas gastado.');
  }

  const over = budgets.filter((b) => b.monto > 0 && b.gastado > b.monto);
  const close = budgets.filter((b) => b.monto > 0 && b.gastado <= b.monto && b.gastado > b.monto * 0.8);
  if (over.length) {
    if (tone === 'good') tone = 'warn';
    lines.push(`Presupuesto pasado: ${over.map((b) => b.nombre).join(', ')}.`);
  } else if (close.length) {
    lines.push(`Cerca del límite: ${close.map((b) => b.nombre).join(', ')}.`);
  } else if (budgets.length) {
    lines.push('Tus presupuestos van bien.');
  } else {
    lines.push('Crea un presupuesto para controlar a dónde va tu dinero.');
  }

  if (streak >= 2) lines.push(`Llevas ${streak} días seguidos registrando. ¡Sigue así!`);

  const overdue = upcoming.filter((u) => u.overdue);
  if (overdue.length) {
    if (tone === 'good') tone = 'warn';
    const u = overdue[0];
    lines.push(`Pendiente: ${u.title}${u.amount ? ` (¤${money(u.amount)})` : ''}`);
  }
  const next = upcoming.filter((u) => !u.overdue && (u.date === tomorrow || u.date === today));
  if (next.length) {
    const u = next[0];
    lines.push(`${u.date === today ? 'Hoy vence' : 'Mañana'}: ${u.title}${u.amount ? ` (¤${money(u.amount)})` : ''}`);
  }

  const title = tone === 'nudge' ? 'Cierra tu día' : tone === 'warn' ? 'Ojo con tus números' : '¡Buen día de finanzas!';
  const closing = CLOSINGS[now.getDate() % CLOSINGS.length];
  return { tone, title, lines, streak, closing };
}

// ── Aviso diario: a la hora de cerrar el día ─────────────────────────────────────────

export interface ClosingReminder {
  key: string;
  at: Date;
  title: string;
  body: string;
}

/** Un aviso por noche para los próximos días, a la hora indicada (por defecto 8:00 p. m.). Las que ya pasaron se omiten. */
export function dailyClosingReminders(now: Date, days = 7, hour = 20): ClosingReminder[] {
  const out: ClosingReminder[] = [];
  for (let i = 0; i < days; i++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hour, 0, 0);
    if (at.getTime() <= now.getTime()) continue;
    out.push({
      key: `resumen-${isoDay(at)}`,
      at,
      title: 'Cierra tu día con Salomón',
      body: 'Registra tus gastos de hoy y mira cómo vas.',
    });
  }
  return out;
}
