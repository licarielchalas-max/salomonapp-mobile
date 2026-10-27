import { useCallback, useEffect, useState } from 'react';
import { useReloadOnFocus } from './useReloadOnFocus';
import { supabase } from '../lib/supabase';

interface BudgetMap {
  [categoryId: string]: { id: string; monthly_limit: number } | undefined;
}

export function useCategoryBudgets(householdId: string | null) {
  const [budgets, setBudgets] = useState<BudgetMap>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!householdId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('category_budgets')
      .select('*')
      .eq('household_id', householdId as string);

    if (data) {
      const map: BudgetMap = {};
      (data as Array<{ id: string; category_id: string; monthly_limit: number }>)
        .forEach((r) => { map[r.category_id] = { id: r.id, monthly_limit: r.monthly_limit }; });
      setBudgets(map);
    }
    setLoading(false);
  }, [householdId]);

  useEffect(() => { reload(); }, [reload]);
  useReloadOnFocus(reload);

  const getLimit = (categoryId: string): number =>
    budgets[categoryId]?.monthly_limit ?? 0;

  const setLimit = async (categoryId: string, amount: number): Promise<{ error: string | null }> => {
    if (!householdId) return { error: 'Sin sesión' };
    const existing = budgets[categoryId];

    if (existing) {
      const { error } = await supabase
        .from('category_budgets')
        .update({ monthly_limit: amount } as never)
        .eq('id', existing.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase
        .from('category_budgets')
        .insert({ household_id: householdId, category_id: categoryId, monthly_limit: amount } as never);
      if (error) return { error: error.message };
    }
    await reload();
    return { error: null };
  };

  const removeLimit = async (categoryId: string): Promise<void> => {
    const existing = budgets[categoryId];
    if (!existing) return;
    await supabase.from('category_budgets').delete().eq('id', existing.id);
    await reload();
  };

  const totalBudget = Object.values(budgets).reduce(
    (sum, b) => sum + (b?.monthly_limit ?? 0), 0
  );

  return { budgets, getLimit, setLimit, removeLimit, totalBudget, loading, reload };
}
