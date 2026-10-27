import { useCallback, useEffect, useState } from 'react';
import { useReloadOnFocus } from './useReloadOnFocus';
import { supabase } from '../lib/supabase';
import { toDb, type AccountRef } from '../lib/money';
import type { GoalRow, GoalInsert } from '../types/db';

export function useGoals(householdId: string | null) {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!householdId) {
      setGoals([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });
    setGoals(data ?? []);
    setLoading(false);
  }, [householdId]);

  useEffect(() => { reload(); }, [reload]);
  useReloadOnFocus(reload);

  async function addGoal(input: Omit<GoalInsert, 'household_id'>) {
    if (!householdId) return { error: 'No hay sesión activa.' };
    const { error } = await supabase
      .from('goals')
      .insert({ ...input, household_id: householdId, current_amount: 0 });
    if (!error) await reload();
    return { error: error?.message ?? null };
  }

  // El aporte sale de una cuenta: la base de datos rechaza el aporte si no hay fondos.
  async function addContribution(goalId: string, monto: number, account: AccountRef, funding: Record<string, unknown> = {}) {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return { error: 'Meta no encontrada' };
    const { error: contribErr } = await supabase
      .from('goal_contributions')
      .insert({ goal_id: goalId, monto, ...toDb(account), ...funding } as never);
    if (contribErr) return { error: contribErr.message };
    const { error: updateErr } = await supabase
      .from('goals')
      .update({ current_amount: goal.current_amount + monto })
      .eq('id', goalId);
    if (!updateErr) await reload();
    return { error: updateErr?.message ?? null };
  }

  async function updateGoal(id: string, changes: { nombre?: string; target_amount?: number }) {
    const { error } = await supabase.from('goals').update(changes).eq('id', id);
    if (!error) await reload();
    return { error: error?.message ?? null };
  }

  async function deleteGoal(id: string) {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (!error) await reload();
    return { error: error?.message ?? null };
  }

  return { goals, loading, addGoal, addContribution, updateGoal, deleteGoal, reload };
}
