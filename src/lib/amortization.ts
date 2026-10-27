// Tabla de amortización de un préstamo: cómo se reparte cada cuota entre interés y capital hasta saldar el saldo.

export interface AmortRow {
  /** Número de cuota, empezando en 1. */
  n: number;
  /** Fecha de la cuota (YYYY-MM-DD) o null si se desconoce el día de pago. */
  date: string | null;
  cuota: number;
  interes: number;
  capital: number;
  saldo: number;
}

export interface AmortSchedule {
  rows: AmortRow[];
  totalInteres: number;
  totalPagado: number;
  /** false si la cuota no cubre ni el interés del primer mes: el saldo nunca baja. */
  viable: boolean;
  /** true si se cortó en `maxRows` sin llegar a cero. */
  truncated: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function addMonths(iso: string, k: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1 + k, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const day = Math.min(d, last);
  const mm = String(target.getMonth() + 1).padStart(2, '0');
  return `${target.getFullYear()}-${mm}-${String(day).padStart(2, '0')}`;
}

/**
 * Proyecta las cuotas que faltan desde el saldo actual.
 * `annualRatePct` es la tasa anual en porcentaje (18 = 18%); el interés mensual es tasa/12 sobre el saldo.
 * La última cuota se ajusta para cerrar el saldo exacto.
 */
export function amortizationSchedule(
  saldo: number,
  cuota: number,
  annualRatePct: number,
  firstDate: string | null = null,
  maxRows = 600
): AmortSchedule {
  const empty: AmortSchedule = { rows: [], totalInteres: 0, totalPagado: 0, viable: true, truncated: false };
  if (!(saldo > 0)) return empty;
  if (!(cuota > 0)) return { ...empty, viable: false };

  const r = annualRatePct / 12 / 100;
  if (r * saldo >= cuota && r > 0) return { ...empty, viable: false };

  const rows: AmortRow[] = [];
  let bal = round2(saldo);
  let totalInteres = 0;
  let totalPagado = 0;
  while (bal > 0 && rows.length < maxRows) {
    const interes = round2(bal * r);
    const final = bal + interes <= cuota;
    const pago = final ? round2(bal + interes) : cuota;
    const capital = round2(pago - interes);
    bal = final ? 0 : round2(bal - capital);
    const n = rows.length + 1;
    rows.push({ n, date: firstDate ? addMonths(firstDate, n - 1) : null, cuota: pago, interes, capital, saldo: bal });
    totalInteres += interes;
    totalPagado += pago;
  }
  return { rows, totalInteres: round2(totalInteres), totalPagado: round2(totalPagado), viable: true, truncated: bal > 0 };
}

// ── Avance real del préstamo: pagos hechos + lo que falta, comparado con pagar siempre la cuota normal ──

export interface LoanPayment {
  occurred_on: string;
  created_at?: string;
  monto_total: number;
  interes: number;
  capital: number;
  saldo_anterior: number;
  saldo_nuevo: number;
}

export interface PaidRow extends AmortRow {
  /** Lo que se pagó por encima de la cuota (va directo a capital). */
  extra: number;
}

export interface LoanProgress {
  paid: PaidRow[];
  remaining: AmortSchedule;
  /** Plan original: pagar solo la cuota normal desde el saldo con que empezó el seguimiento. */
  baseline: AmortSchedule;
  /** Intereses que te ahorras frente al plan original (negativo si pagaste menos que la cuota). */
  interestSaved: number;
  /** Cuotas que te ahorras frente al plan original (negativo si te atrasas). */
  monthsSaved: number;
  /** Total pagado por encima de la cuota. */
  extraPaid: number;
}

export function loanProgress(
  loan: { saldo: number; cuota: number; tasaAnual: number },
  payments: LoanPayment[],
  opts: { extraMonthly?: number; nextDate?: string | null } = {}
): LoanProgress {
  const sorted = [...payments].sort(
    (a, b) => a.occurred_on.localeCompare(b.occurred_on) || (a.created_at ?? '').localeCompare(b.created_at ?? '')
  );
  const paid: PaidRow[] = sorted.map((p, i) => {
    const total = Number(p.monto_total);
    const extra = loan.cuota > 0 ? Math.max(0, round2(total - loan.cuota)) : 0;
    return {
      n: i + 1,
      date: p.occurred_on,
      cuota: total,
      interes: Number(p.interes),
      capital: Number(p.capital),
      saldo: Number(p.saldo_nuevo),
      extra,
    };
  });

  const start = sorted.length ? Number(sorted[0].saldo_anterior) : loan.saldo;
  const baseline = amortizationSchedule(start, loan.cuota, loan.tasaAnual);

  const remainingRaw = amortizationSchedule(loan.saldo, loan.cuota + (opts.extraMonthly ?? 0), loan.tasaAnual, opts.nextDate ?? null);
  const remaining: AmortSchedule = {
    ...remainingRaw,
    rows: remainingRaw.rows.map((r, i) => ({ ...r, n: paid.length + i + 1 })),
  };

  const comparable = baseline.viable && remaining.viable && baseline.rows.length > 0;
  const paidInterest = paid.reduce((s, p) => s + p.interes, 0);
  return {
    paid,
    remaining,
    baseline,
    interestSaved: comparable ? round2(baseline.totalInteres - (paidInterest + remaining.totalInteres)) : 0,
    monthsSaved: comparable ? baseline.rows.length - (paid.length + remaining.rows.length) : 0,
    extraPaid: round2(paid.reduce((s, p) => s + p.extra, 0)),
  };
}

// ── ¿Cuánto extra puedes pagar sin ahogarte? Según el Score (colchón, ahorro y control del gasto) ──

export type ExtraLevel = 'sin-datos' | 'primero-colchon' | 'ligero' | 'moderado' | 'fuerte';

export interface ExtraCapacity {
  level: ExtraLevel;
  /** Porcentaje sugerido sobre la cuota normal (0 si no conviene todavía). */
  pct: 0 | 10 | 25 | 50;
}

export function extraCapacity(p: { colchon: number | null; ahorro: number | null; gasto: number | null }): ExtraCapacity {
  if (p.colchon === null || p.gasto === null) return { level: 'sin-datos', pct: 0 };
  const ahorro = p.ahorro ?? 0;
  // Colchón < ~1 mes de gastos (33/100): primero el fondo de emergencia, un extra pone en riesgo el mes.
  if (p.colchon < 33 || p.gasto < 30) return { level: 'primero-colchon', pct: 0 };
  if (p.colchon >= 100 && ahorro >= 70 && p.gasto >= 70) return { level: 'fuerte', pct: 50 };
  if (p.colchon >= 66 && ahorro >= 50 && p.gasto >= 50) return { level: 'moderado', pct: 25 };
  return { level: 'ligero', pct: 10 };
}
