import { dateLocale } from '../lib/i18n';
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

// Rango [inicio, fin] (inclusive) del mes que contiene `reference`, en formato
// YYYY-MM-DD â€” se usa para filtrar transactions.occurred_on y asÃ­ el
// dashboard/presupuesto reflejan solo el mes en curso (bug corregido del prototipo).
export function currentMonthRange(reference: Date = new Date()): { start: string; end: string; label: string } {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  const label = reference.toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' });
  return { start: toISODate(start), end: toISODate(end), label };
}

