// Contexto financiero que se le da al Rey Salomón: cuanto más completo y ordenado, más acertadas sus respuestas.
// Es lógica pura (sin pantallas ni red). Todos los montos llegan ya en la moneda base.
import { isoDay, loggingStreak, type DayTx } from './dailySummary';

export interface AdvisorTx extends DayTx {
  descripcion: string | null;
}

export interface AdvisorContextInput {
  now: Date;
  /** Símbolo y nombre de la moneda base (por ejemplo "RD$" y "Peso dominicano"). */
  symbol: string;
  currencyName: string;
  monthLabel: string;
  ingresos: number;
  gastos: number;
  balance: number;
  /** Movimientos del mes (montos en moneda base). */
  transactions: AdvisorTx[];
  /** Dinero por cuenta, ya escrito en su moneda ("Banco Popular: RD$ 12,000.00"). */
  accounts: { nombre: string; saldo: string }[];
  budgets: { nombre: string; monto: number; gastado: number; disponible: number; cuenta: string }[];
  debts: { nombre: string; tipo: string; saldo: number; cuota: number; tasaAnual: number; diaPago: number | null; moneda: string }[];
  upcoming: { title: string; date: string; overdue: boolean; amount?: number }[];
  goals: { nombre: string; actual: number; meta: number }[];
  score: { total: number; label: string; weakest?: { label: string; score: number } };
}

const fmt = (n: number) => Math.round(n * 100) / 100;

export function buildAdvisorContext(i: AdvisorContextInput): string {
  const s = i.symbol;
  const m = (n: number) => `${s}${fmt(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const today = isoDay(i.now);
  const daysInMonth = new Date(i.now.getFullYear(), i.now.getMonth() + 1, 0).getDate();
  const out: string[] = [];

  out.push(`FECHA: ${today} (día ${i.now.getDate()} de ${daysInMonth} del mes). Moneda base: ${i.currencyName} (${s}).`);
  out.push(`MES (${i.monthLabel}): ingresos ${m(i.ingresos)}, gastos ${m(i.gastos)}, balance ${m(i.balance)}${i.ingresos > 0 ? `, gastado ${Math.round((i.gastos / i.ingresos) * 100)}% de los ingresos` : ''}.`);

  const hoy = i.transactions.filter((t) => t.occurred_on === today);
  const gHoy = hoy.filter((t) => t.kind === 'gasto').reduce((a, t) => a + t.amount, 0);
  const iHoy = hoy.filter((t) => t.kind === 'ingreso').reduce((a, t) => a + t.amount, 0);
  out.push(`HOY: ${hoy.length} movimientos, gastos ${m(gHoy)}, ingresos ${m(iHoy)}. Racha registrando: ${loggingStreak(i.transactions, i.now)} días.`);

  const top = i.transactions
    .filter((t) => t.kind === 'gasto')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((t) => `${t.descripcion || 'Sin descripción'} ${m(t.amount)}`);
  if (top.length) out.push(`MAYORES GASTOS DEL MES: ${top.join('; ')}.`);

  out.push(i.accounts.length ? `CUENTAS: ${i.accounts.slice(0, 8).map((a) => `${a.nombre} ${a.saldo}`).join('; ')}.` : 'CUENTAS: ninguna registrada.');

  out.push(
    i.budgets.length
      ? `PRESUPUESTOS: ${i.budgets
          .slice(0, 8)
          .map((b) => `${b.nombre} (sale de ${b.cuenta}): gastado ${m(b.gastado)} de ${m(b.monto)}, disponible ${m(b.disponible)}${b.gastado > b.monto ? ' [PASADO]' : b.gastado > b.monto * 0.8 ? ' [cerca del límite]' : ''}`)
          .join('; ')}.`
      : 'PRESUPUESTOS: ninguno creado.',
  );

  out.push(
    i.debts.length
      ? `DEUDAS: ${i.debts
          .slice(0, 8)
          .map((d) => `${d.nombre} (${d.tipo}, ${d.moneda}): saldo ${fmt(d.saldo)}, cuota ${fmt(d.cuota)}/mes, tasa ${d.tasaAnual}% anual${d.diaPago ? `, paga el día ${d.diaPago}` : ''}`)
          .join('; ')}.`
      : 'DEUDAS: ninguna registrada.',
  );

  if (i.upcoming.length) {
    out.push(`PRÓXIMOS PAGOS Y AVISOS: ${i.upcoming.slice(0, 8).map((u) => `${u.title} el ${u.date}${u.overdue ? ' [VENCIDO]' : ''}${u.amount ? ` (${m(u.amount)})` : ''}`).join('; ')}.`);
  }

  if (i.goals.length) out.push(`METAS: ${i.goals.slice(0, 6).map((g) => `${g.nombre} ${m(g.actual)} de ${m(g.meta)}`).join('; ')}.`);

  out.push(`SCORE SALOMÓN: ${i.score.total} (${i.score.label})${i.score.weakest ? `; punto más débil: ${i.score.weakest.label} (${Math.round(i.score.weakest.score)}/100)` : ''}.`);
  return out.join('\n');
}

/** Últimos turnos de la conversación para que el asistente recuerde de qué hablaban. */
export function recentHistory(messages: { role: 'user' | 'assistant'; content: string }[], max = 8): { role: 'user' | 'assistant'; content: string }[] {
  return messages
    .filter((m) => m.content.trim())
    .slice(-max)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }));
}
