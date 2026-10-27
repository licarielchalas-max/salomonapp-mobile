// Fechas locales YYYY-MM-DD usadas por el cálculo del score.
export { addDays, toISODate } from './reminders';

export function currentMonthBounds(ref: Date = new Date()): { start: string; end: string } {
  const p = (n: number) => String(n).padStart(2, '0');
  const s = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const e = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return {
    start: `${s.getFullYear()}-${p(s.getMonth() + 1)}-${p(s.getDate())}`,
    end: `${e.getFullYear()}-${p(e.getMonth() + 1)}-${p(e.getDate())}`,
  };
}
