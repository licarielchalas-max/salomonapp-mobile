import { useCallback, useEffect, useMemo, useState } from 'react';
import { amountToBase } from '../lib/currency';
import { supabase } from '../lib/supabase';
import { useReloadOnFocus } from './useReloadOnFocus';
import { addDays, toISODate, currentMonthBounds } from '../lib/scoreDates';
import { loadDebtSchedule } from './useDebtSchedule';
import { debtScoreEntries } from '../lib/debtDates';
import { computeScore, type Confidence, type Grade, type ScoreInput, type ScoreResult } from '../lib/score';

export interface ScorePillar {
  label: string;
  score: number; // 0-100
  max: number;
  icon: string;
  tip: string;
}

export interface FinancialScore {
  total: number; // 300-850
  grade: Grade;
  label: string;
  color: string;
  confidence: Confidence;
  provisional: boolean;
  /** Factores medidos (los que ya tienen datos), para el chat y los consejos rápidos. */
  pillars: ScorePillar[];
  /** Resultado completo con pesos, detalle y datos usados. */
  result: ScoreResult | null;
  loading: boolean;
  reload: () => Promise<void>;
}

const GRADE_COLOR: Record<Grade, string> = {
  'A+': '#2F6F52',
  A: '#2F6F52',
  B: '#5A8C3C',
  C: '#C9A227',
  D: '#C07020',
  F: '#8C4A3B',
};

const EMPTY_INPUT = (now: Date): ScoreInput => ({
  now,
  transactions: [],
  scheduled: [],
  debts: [],
  goals: [],
  liquidTotal: 0,
  budgets: [],
  firstActivity: null,
});

// Reúne los datos reales del hogar (últimos 90 días) y calcula el Score Salomón.
export function useFinancialScore(householdId: string | null): FinancialScore {
  const [input, setInput] = useState<ScoreInput | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!householdId) {
      setLoading(false);
      return;
    }
    const now = new Date();
    const today = toISODate(now);
    const since = addDays(today, -90);
    const { start, end } = currentMonthBounds(now);

    const schedule = await loadDebtSchedule(householdId);
    const [tx, first, sched, debts, goals, balances, budgets, moves] = await Promise.all([
      supabase.from('transactions').select('kind, monto, moneda, occurred_on, origin_scheduled_expense_id').eq('household_id', householdId).gte('occurred_on', since),
      supabase.from('transactions').select('occurred_on').eq('household_id', householdId).order('occurred_on', { ascending: true }).limit(1),
      supabase.from('scheduled_expenses').select('id, fecha_pago, status, pospuesto_veces').eq('household_id', householdId),
      supabase.from('debts').select('cuota_mensual, saldo, status, moneda').eq('household_id', householdId),
      supabase.from('goals').select('current_amount, target_amount').eq('household_id', householdId),
      supabase.from('account_balances').select('saldo, moneda').eq('household_id', householdId),
      supabase.from('budgets').select('id, monto').eq('household_id', householdId),
      supabase.from('budget_movements').select('budget_id, tipo, monto').eq('household_id', householdId).eq('tipo', 'gasto').gte('occurred_on', start).lte('occurred_on', end),
    ]);

    const txRows = (tx.data ?? []) as { kind: 'gasto' | 'ingreso'; monto: number; moneda: string; occurred_on: string; origin_scheduled_expense_id: string | null }[];
    const paidOn: Record<string, string> = {};
    for (const t of txRows) if (t.origin_scheduled_expense_id) paidOn[t.origin_scheduled_expense_id] = t.occurred_on;

    const spentByBudget: Record<string, number> = {};
    for (const m of (moves.data ?? []) as { budget_id: string; monto: number }[]) {
      spentByBudget[m.budget_id] = (spentByBudget[m.budget_id] ?? 0) + Number(m.monto);
    }

    setInput({
      now,
      transactions: txRows.map((t) => ({ kind: t.kind, monto: amountToBase(t), occurred_on: t.occurred_on })),
      firstActivity: (first.data?.[0] as { occurred_on: string } | undefined)?.occurred_on ?? null,
      scheduled: [
        ...((sched.data ?? []) as { id: string; fecha_pago: string; status: 'pendiente' | 'pagado'; pospuesto_veces: number }[]).map((s) => ({
          fecha_pago: s.fecha_pago,
          status: s.status,
          paid_on: paidOn[s.id] ?? null,
          pospuesto_veces: s.pospuesto_veces ?? 0,
        })),
        // Cuotas de tarjetas y préstamos: ¿se pagó el último vencimiento?
        ...debtScoreEntries(schedule.items, schedule.payments, now),
      ],
      debts: ((debts.data ?? []) as { cuota_mensual: number; saldo: number; status?: string; moneda: string | null }[])
        .filter((d) => d.status !== 'pagada' && Number(d.saldo) > 0)
        .map((d) => ({ cuota_mensual: amountToBase({ amount: d.cuota_mensual, moneda: d.moneda }) })),
      goals: ((goals.data ?? []) as { current_amount: number; target_amount: number }[]).map((g) => ({
        current_amount: Number(g.current_amount),
        target_amount: Number(g.target_amount),
      })),
      liquidTotal: ((balances.data ?? []) as { saldo: number; moneda: string }[]).reduce((s, b) => s + amountToBase({ amount: b.saldo, moneda: b.moneda }), 0),
      budgets: ((budgets.data ?? []) as { id: string; monto: number }[]).map((b) => ({ monto: Number(b.monto), gastado: spentByBudget[b.id] ?? 0 })),
    });
    setLoading(false);
  }, [householdId]);

  useEffect(() => { reload(); }, [reload]);
  useReloadOnFocus(reload);

  return useMemo<FinancialScore>(() => {
    const result = computeScore(input ?? EMPTY_INPUT(new Date()));
    return {
      total: result.total,
      grade: result.grade,
      label: result.provisional ? `${result.label} (provisional)` : result.label,
      color: GRADE_COLOR[result.grade],
      confidence: result.confidence,
      provisional: result.provisional,
      pillars: result.pillars
        .filter((p) => p.score !== null)
        .map((p) => ({ label: p.label, score: p.score as number, max: 100, icon: p.icon, tip: p.tip })),
      result: input ? result : null,
      loading,
      reload,
    };
  }, [input, loading, reload]);
}
