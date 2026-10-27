import { baseSymbol } from './currency';
// Score Salomón: un puntaje de 300 a 850 calculado con los datos que la persona registra en la app.
// No es un reporte de buró de crédito. Cinco factores con peso fijo; si no hay datos de un factor,
// se omite y los demás se reparten su peso. Con poco historial el puntaje es provisional y no
// puede pasar de 650: así una cuenta vacía nunca aparece como "Excelente".

export type Grade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
export type Confidence = 'baja' | 'media' | 'alta';
export type PillarKey = 'pagos' | 'deudas' | 'ahorro' | 'colchon' | 'gasto';

export const SCORE_MIN = 300;
export const SCORE_MAX = 850;
export const PROVISIONAL_RANGE = { min: 500, max: 650 };

export const PILLAR_WEIGHTS: Record<PillarKey, number> = {
  pagos: 30,
  deudas: 25,
  ahorro: 20,
  colchon: 15,
  gasto: 10,
};

export const PILLAR_META: Record<PillarKey, { label: string; icon: 'calendar' | 'card' | 'target' | 'shield' | 'bars'; what: string }> = {
  pagos: { label: 'Pagos a tiempo', icon: 'calendar', what: 'Pagos programados que pagaste antes de su fecha, frente a los vencidos o tardíos (últimos 90 días).' },
  deudas: { label: 'Deudas', icon: 'card', what: 'Cuánto de tu ingreso mensual se va en cuotas de deudas. Por debajo del 15% es lo ideal; arriba del 50% es riesgo alto.' },
  ahorro: { label: 'Ahorro', icon: 'target', what: 'Qué parte de tus ingresos te queda (meta: 20%) y cuánto llevas de tus metas de ahorro.' },
  colchon: { label: 'Colchón de emergencia', icon: 'shield', what: 'Cuántos meses de gastos cubre el dinero que tienes en tus cuentas (meta: 3 meses).' },
  gasto: { label: 'Control del gasto', icon: 'bars', what: 'Gastas menos del 80% de lo que ingresas y respetas tus presupuestos.' },
};

export interface ScoreInput {
  now: Date;
  /** Movimientos de los últimos 90 días. */
  transactions: { kind: 'gasto' | 'ingreso'; monto: number; occurred_on: string }[];
  /** Pagos programados: pendientes y pagados. `paid_on` es la fecha en que se pagó (si se pagó). */
  scheduled: { fecha_pago: string; status: 'pendiente' | 'pagado'; paid_on: string | null; pospuesto_veces: number }[];
  /** Deudas con saldo pendiente. */
  debts: { cuota_mensual: number }[];
  goals: { current_amount: number; target_amount: number }[];
  /** Dinero disponible hoy en efectivo y cuentas. */
  liquidTotal: number;
  /** Presupuestos del mes. */
  budgets: { monto: number; gastado: number }[];
  /** Fecha del primer movimiento registrado (YYYY-MM-DD) o null si no hay ninguno. */
  firstActivity: string | null;
}

export interface ScorePillarResult {
  key: PillarKey;
  label: string;
  icon: (typeof PILLAR_META)[PillarKey]['icon'];
  /** 0–100, o null si aún no hay datos para medirlo. */
  score: number | null;
  weight: number;
  /** Peso efectivo tras repartir el de los factores sin datos. */
  effectiveWeight: number;
  /** Puntos que podrías ganar si este factor llegara a 100. */
  potential: number;
  tip: string;
  detail: string;
}

export interface ScoreResult {
  total: number;
  grade: Grade;
  label: string;
  confidence: Confidence;
  provisional: boolean;
  pillars: ScorePillarResult[];
  /** Datos usados, para mostrar de dónde sale el puntaje. */
  basis: { movements: number; historyDays: number; scheduledReviewed: number };
  /** Qué falta para dejar de ser provisional. */
  missing: string[];
}

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));
const DAY = 86400000;

function dayStart(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
function dateMs(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}
const money = (n: number) => `${baseSymbol()}${Math.round(n).toLocaleString('es-DO')}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

export function gradeFor(total: number): Grade {
  return total >= 800 ? 'A+' : total >= 740 ? 'A' : total >= 670 ? 'B' : total >= 580 ? 'C' : total >= 500 ? 'D' : 'F';
}

export function labelFor(grade: Grade): string {
  return { 'A+': 'Excelente', A: 'Muy bueno', B: 'Bueno', C: 'Regular', D: 'Bajo', F: 'Crítico' }[grade];
}

/** Posición 0–1 del puntaje en la escala 300–850. */
export function scorePosition(total: number): number {
  return clamp((total - SCORE_MIN) / (SCORE_MAX - SCORE_MIN), 0, 1);
}

export function computeScore(input: ScoreInput): ScoreResult {
  const today = dayStart(input.now);
  const first = input.firstActivity ? dateMs(input.firstActivity) : null;
  const historyDays = first === null ? 0 : Math.max(0, Math.round((today - first) / DAY) + 1);
  const monthsCovered = clamp(Math.min(historyDays, 90) / 30, 1, 3);

  const ingresos = input.transactions.filter((t) => t.kind === 'ingreso').reduce((s, t) => s + Number(t.monto), 0);
  const gastos = input.transactions.filter((t) => t.kind === 'gasto').reduce((s, t) => s + Number(t.monto), 0);
  const ingresoMensual = ingresos / monthsCovered;
  const gastoMensual = gastos / monthsCovered;
  const movements = input.transactions.length;

  // ── Pagos a tiempo ──────────────────────────────────────────────────────
  const windowStart = today - 90 * DAY;
  const reviewed = input.scheduled.filter((s) => {
    const due = dateMs(s.fecha_pago);
    return s.status === 'pendiente' ? due < today : due >= windowStart && due <= today + DAY;
  });
  let onTime = 0;
  let late = 0;
  let overdue = 0;
  let postponed = 0;
  for (const s of reviewed) {
    postponed += s.pospuesto_veces;
    if (s.status === 'pendiente') overdue += 1;
    else if (s.paid_on && dateMs(s.paid_on) > dateMs(s.fecha_pago)) late += 1;
    else onTime += 1;
  }
  const pagosN = onTime + late + overdue;
  const pagosScore = pagosN === 0 ? null : clamp(((onTime + 0.5 * late) / pagosN) * 100 - Math.min(15, postponed * 3));

  // ── Deudas ──────────────────────────────────────────────────────────────
  const cuotas = input.debts.reduce((s, d) => s + Number(d.cuota_mensual), 0);
  const dti = ingresoMensual > 0 ? cuotas / ingresoMensual : null;
  const deudasScore =
    input.debts.length === 0 ? 100 : dti === null ? 20 : clamp(((0.5 - dti) / 0.35) * 100);

  // ── Ahorro ──────────────────────────────────────────────────────────────
  const savingsRate = ingresoMensual > 0 ? (ingresoMensual - gastoMensual) / ingresoMensual : null;
  const goalsPct = input.goals.length
    ? input.goals.reduce((s, g) => s + Math.min(1, Number(g.current_amount) / Math.max(1, Number(g.target_amount))), 0) / input.goals.length
    : null;
  const rateScore = savingsRate === null ? null : clamp((savingsRate / 0.2) * 100);
  const ahorroScore =
    rateScore === null ? (goalsPct === null ? null : goalsPct * 100) : goalsPct === null ? rateScore : rateScore * 0.7 + goalsPct * 100 * 0.3;

  // ── Colchón de emergencia ───────────────────────────────────────────────
  const liquid = Math.max(0, input.liquidTotal);
  const months = gastoMensual > 0 ? liquid / gastoMensual : liquid > 0 ? 3 : 0;
  const colchonScore = gastos === 0 && liquid === 0 && movements === 0 ? null : clamp((months / 3) * 100);

  // ── Control del gasto ───────────────────────────────────────────────────
  const ratio = ingresoMensual > 0 ? gastoMensual / ingresoMensual : null;
  const overBudget = input.budgets.filter((b) => b.gastado > b.monto).length;
  const gastoBase = ratio === null ? (gastoMensual > 0 ? 0 : null) : clamp(((1.2 - ratio) / 0.4) * 100);
  const gastoScore = gastoBase === null ? null : clamp(gastoBase - Math.min(30, overBudget * 10));

  const raw: Record<PillarKey, number | null> = {
    pagos: pagosScore,
    deudas: deudasScore,
    ahorro: ahorroScore,
    colchon: colchonScore,
    gasto: gastoScore,
  };

  const measured = (Object.keys(raw) as PillarKey[]).filter((k) => raw[k] !== null);
  const totalWeight = measured.reduce((s, k) => s + PILLAR_WEIGHTS[k], 0) || 1;

  const tips: Record<PillarKey, { tip: string; detail: string }> = {
    pagos: {
      tip:
        overdue > 0
          ? `Paga tus ${overdue} pago${overdue > 1 ? 's' : ''} vencido${overdue > 1 ? 's' : ''}: es lo que más pesa en tu puntaje.`
          : late > 0
            ? 'Paga antes de la fecha de vencimiento. Activa los avisos en la Agenda para no olvidarlo.'
            : postponed > 0 && pagosN > 0
              ? 'Evita posponer pagos: cada posposición resta puntos. Paga en la fecha original.'
              : pagosN === 0
              ? 'Programa tus pagos (luz, agua, tarjeta, préstamos) en la Agenda: así medimos tu puntualidad.'
              : 'Sigue pagando a tiempo: es lo que más pesa en tu puntaje.',
      detail: pagosN === 0 ? 'Sin pagos programados todavía' : `${onTime} a tiempo · ${late} tardío${late !== 1 ? 's' : ''} · ${overdue} vencido${overdue !== 1 ? 's' : ''}`,
    },
    deudas: {
      tip:
        input.debts.length === 0
          ? 'Sin deudas: mantenlo así.'
          : dti === null
            ? 'Registra tus ingresos para medir cuánto de tu dinero se va en cuotas.'
            : dti > 0.15
              ? `Tus cuotas son el ${pct(dti)} de tu ingreso. Baja de 15% pagando capital extra o refinanciando.`
              : 'Tus cuotas están bajo control.',
      detail: input.debts.length === 0 ? 'Sin deudas registradas' : dti === null ? `${money(cuotas)} en cuotas al mes` : `Cuotas: ${pct(dti)} del ingreso`,
    },
    ahorro: {
      tip:
        savingsRate === null
          ? 'Registra tus ingresos y gastos para medir cuánto ahorras.'
          : savingsRate < 0.2
            ? `Hoy ahorras el ${pct(Math.max(0, savingsRate))}. Apunta al 20%: separa el dinero apenas cobres con un presupuesto.`
            : goalsPct !== null && goalsPct < 1
              ? `Tu tasa de ahorro es buena. Para subir más, aporta a tus metas (llevas ${pct(goalsPct)}).`
              : 'Tu tasa de ahorro es excelente.',
      detail: savingsRate === null ? 'Sin ingresos registrados' : `Ahorras ${pct(Math.max(0, savingsRate))} de tus ingresos${goalsPct !== null ? ` · metas al ${pct(goalsPct)}` : ''}`,
    },
    colchon: {
      tip:
        months >= 3
          ? 'Tu colchón de emergencia está completo.'
          : `Tu dinero cubre ${months.toFixed(1)} meses de gastos. Llega a 3 meses con aportes a tu Fondo de Emergencia.`,
      detail: `${months >= 12 ? 'Más de 12' : months.toFixed(1)} meses de gastos cubiertos · ${money(liquid)} disponibles`,
    },
    gasto: {
      tip:
        ratio === null
          ? 'Registra tus ingresos para medir tu control del gasto.'
          : ratio > 0.8
            ? `Gastas el ${pct(ratio)} de lo que ingresas. Intenta quedarte por debajo del 80%.`
            : overBudget > 0
              ? `Te pasaste en ${overBudget} presupuesto${overBudget > 1 ? 's' : ''} este mes.`
              : 'Buen control del gasto.',
      detail: ratio === null ? 'Sin ingresos registrados' : `Gastas ${pct(ratio)} de tus ingresos${overBudget ? ` · ${overBudget} presupuesto${overBudget > 1 ? 's' : ''} excedido${overBudget > 1 ? 's' : ''}` : ''}`,
    },
  };

  let weighted = 0;
  const pillars: ScorePillarResult[] = (Object.keys(PILLAR_WEIGHTS) as PillarKey[]).map((key) => {
    const score = raw[key] === null ? null : Math.round(raw[key] as number);
    const effectiveWeight = score === null ? 0 : (PILLAR_WEIGHTS[key] / totalWeight) * 100;
    if (score !== null) weighted += (score / 100) * effectiveWeight;
    return {
      key,
      label: PILLAR_META[key].label,
      icon: PILLAR_META[key].icon,
      score,
      weight: PILLAR_WEIGHTS[key],
      effectiveWeight: Math.round(effectiveWeight),
      potential: score === null ? 0 : Math.round(((100 - score) / 100) * (effectiveWeight / 100) * (SCORE_MAX - SCORE_MIN)),
      tip: tips[key].tip,
      detail: tips[key].detail,
    };
  });

  let total = Math.round(SCORE_MIN + (weighted / 100) * (SCORE_MAX - SCORE_MIN));

  const confidence: Confidence =
    historyDays >= 60 && movements >= 30 ? 'alta' : historyDays >= 14 && movements >= 10 ? 'media' : 'baja';
  const provisional = confidence === 'baja';
  if (provisional) total = clamp(total, PROVISIONAL_RANGE.min, PROVISIONAL_RANGE.max);

  const missing: string[] = [];
  if (provisional) {
    if (historyDays < 14) missing.push(`Usa la app al menos 14 días (llevas ${historyDays}).`);
    if (movements < 10) missing.push(`Registra al menos 10 movimientos (llevas ${movements}).`);
  }
  if (pagosN === 0) missing.push('Programa un pago en la Agenda para medir tu puntualidad.');
  if (ingresos === 0) missing.push('Registra tus ingresos para medir ahorro, deudas y gasto.');

  const grade = gradeFor(total);
  return {
    total,
    grade,
    label: labelFor(grade),
    confidence,
    provisional,
    pillars,
    basis: { movements, historyDays, scheduledReviewed: pagosN },
    missing,
  };
}

export const SCORE_METHOD_TEXT = {
  intro:
    'El Score Salomón es un puntaje de 300 a 850 que mide qué tan sana está tu vida financiera usando los datos que registras en la app. Es un indicador propio de Salomón, parecido en escala al de un buró de crédito, pero no es un reporte de crédito ni lo comparte con nadie.',
  scale: 'F (300–499) · D (500–579) · C (580–669) · B (670–739) · A (740–799) · A+ (800–850)',
  provisional:
    'Mientras tengas menos de 14 días de uso o menos de 10 movimientos, el puntaje es provisional y se mantiene entre 500 y 650: no podemos afirmar que estés excelente sin ver tu historial.',
  privacy: 'Tus datos se quedan en tu cuenta. El puntaje se calcula en tu teléfono con tus propios registros.',
  beta: 'Estamos en BETA: ajustamos los pesos y umbrales con el tiempo para que sea cada vez más preciso.',
};
