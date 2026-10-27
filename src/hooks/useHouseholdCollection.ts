import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/db';

type Tables = Database['public']['Tables'];

// PatrÃ³n repetido por goals, debts, scheduled_expenses, calendar_events,
// bank_accounts, referrals, category_budgets y wallet_movements: una lista
// simple acotada a household_id con alta/baja/ediciÃ³n. Se generaliza aquÃ­ en
// vez de repetir el mismo hook siete veces.
export function useHouseholdCollection<TableName extends keyof Tables>(
  table: TableName,
  householdId: string | null,
  orderBy?: { column: string; ascending?: boolean }
) {
  type Row = Tables[TableName]['Row'];
  type Insert = Tables[TableName]['Insert'];

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    let query = supabase.from(table).select('*').eq('household_id' as never, householdId as never);
    if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    const { data, error: fetchError } = await query;
    if (fetchError) setError(fetchError.message);
    else setRows(((data as unknown) as Row[]) ?? []);
    setLoading(false);
  }, [table, householdId, orderBy?.column, orderBy?.ascending]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function add(input: Insert) {
    const { error: insertError } = await supabase.from(table).insert(input as never);
    if (insertError) return { error: insertError.message };
    await reload();
    return { error: null };
  }

  async function remove(id: string) {
    const { error: deleteError } = await supabase.from(table).delete().eq('id' as never, id as never);
    if (deleteError) return { error: deleteError.message };
    await reload();
    return { error: null };
  }

  async function update(id: string, patch: Partial<Row>) {
    const { error: updateError } = await supabase.from(table).update(patch as never).eq('id' as never, id as never);
    if (updateError) return { error: updateError.message };
    await reload();
    return { error: null };
  }

  return { rows, loading, error, add, remove, update, reload };
}

