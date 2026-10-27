import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useReloadOnFocus } from './useReloadOnFocus';
import { currentMonthRange, todayISO } from '../utils/date';
import { toDb, type AccountRef } from '../lib/money';
import type { BudgetInsert, BudgetMovementRow, BudgetRow } from '../types/db';

export interface BudgetSummary extends BudgetRow {
  /** Dinero abonado este mes. */
  abonado: number;
  /** Gastado este mes (gastos pagados desde este presupuesto). */
  gastado: number;
  /** Dinero que hay hoy en el presupuesto (sobre): todo lo abonado menos lo devuelto y lo gastado. */
  disponible: number;
  /** Porcentaje de la meta ya gastado este mes (0–100+). */
  pctGastado: number;
  /** Porcentaje de la meta ya abonado este mes (0–100). */
  pctAbonado: number;
  /** Movimientos del mes, del más reciente al más antiguo. */
  movements: BudgetMovementRow[];
}

type Result = { error: string | null };

export function budgetStatus(b: Pick<BudgetSummary, 'gastado' | 'monto'>): 'ok' | 'warn' | 'over' {
  if (b.gastado > b.monto) return 'over';
  if (b.gastado > b.monto * 0.8) return 'warn';
  return 'ok';
}

// Cada presupuesto es un sobre: el dinero sale de una cuenta al abonar, los gastos pagados
// desde el presupuesto salen del sobre, y lo que sobre se puede devolver a una cuenta.
export function useBudgets(householdId: string | null) {
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [movements, setMovements] = useState<BudgetMovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { start, end } = currentMonthRange();

  const reload = useCallback(async () => {
    if (!householdId) {
      setBudgets([]);
      setMovements([]);
      setLoading(false);
      return;
    }
    const [b, m] = await Promise.all([
      supabase.from('budgets').select('*').eq('household_id', householdId).order('created_at', { ascending: true }),
      supabase
        .from('budget_movements')
        .select('*')
        .eq('household_id', householdId)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false }),
    ]);
    setBudgets((b.data ?? []) as BudgetRow[]);
    setMovements((m.data ?? []) as BudgetMovementRow[]);
    setLoading(false);
  }, [householdId]);

  useEffect(() => { reload(); }, [reload]);
  useReloadOnFocus(reload);

  const summaries = useMemo<BudgetSummary[]>(() => {
    return budgets.map((b) => {
      const all = movements.filter((m) => m.budget_id === b.id);
      const month = all.filter((m) => m.occurred_on >= start && m.occurred_on <= end);
      const sum = (rows: BudgetMovementRow[], tipo: string) =>
        rows.filter((m) => m.tipo === tipo).reduce((s, m) => s + Number(m.monto), 0);
      const abonado = sum(month, 'abono');
      const gastado = sum(month, 'gasto');
      const disponible = sum(all, 'abono') - sum(all, 'retiro') - sum(all, 'gasto');
      const monto = Number(b.monto);
      return {
        ...b,
        monto,
        abonado,
        gastado,
        disponible,
        pctGastado: monto > 0 ? Math.round((gastado / monto) * 100) : 0,
        pctAbonado: monto > 0 ? Math.min(100, Math.round((abonado / monto) * 100)) : 0,
        movements: month,
      };
    });
  }, [budgets, movements, start, end]);

  async function save(input: Omit<BudgetInsert, 'household_id'>, id?: string): Promise<Result> {
    if (!householdId) return { error: 'No hay sesión activa.' };
    if ((input.medio ?? 'efectivo') !== 'efectivo' && !input.bank_account_id) return { error: 'Elige la cuenta de donde saldrá el dinero.' };
    const payload = {
      nombre: input.nombre.trim(),
      monto: input.monto,
      category_id: input.category_id ?? null,
      medio: input.medio ?? 'efectivo',
      bank_account_id: input.medio === 'efectivo' ? null : input.bank_account_id ?? null,
      nota: input.nota?.trim() ? input.nota.trim() : null,
    };
    const { error } = id
      ? await supabase.from('budgets').update(payload as never).eq('id', id)
      : await supabase.from('budgets').insert({ ...payload, household_id: householdId } as never);
    if (!error) await reload();
    return { error: error?.message ?? null };
  }

  async function remove(id: string): Promise<Result> {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (!error) await reload();
    return { error: error?.message ?? null };
  }

  /** Abona (sale de la cuenta hacia el presupuesto) o devuelve (del presupuesto a la cuenta). */
  async function moveMoney(
    budgetId: string,
    tipo: 'abono' | 'retiro',
    monto: number,
    account: AccountRef,
    nota?: string,
    funding: Record<string, unknown> = {},
  ): Promise<Result> {
    if (!householdId) return { error: 'No hay sesión activa.' };
    const { error } = await supabase.from('budget_movements').insert({
      household_id: householdId,
      budget_id: budgetId,
      tipo,
      monto,
      ...toDb(account),
      ...funding,
      nota: nota?.trim() ? nota.trim() : null,
      occurred_on: todayISO(),
    } as never);
    if (!error) await reload();
    return { error: error?.message ?? null };
  }

  async function removeMovement(id: string): Promise<Result> {
    const { error } = await supabase.from('budget_movements').delete().eq('id', id);
    if (!error) await reload();
    return { error: error?.message ?? null };
  }

  const totals = useMemo(() => {
    const monto = summaries.reduce((s, b) => s + b.monto, 0);
    const abonado = summaries.reduce((s, b) => s + b.abonado, 0);
    const gastado = summaries.reduce((s, b) => s + b.gastado, 0);
    const disponible = summaries.reduce((s, b) => s + b.disponible, 0);
    return { monto, abonado, gastado, disponible };
  }, [summaries]);

  return { budgets: summaries, totals, loading, save, remove, moveMoney, removeMovement, reload };
}
