import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { currentMonthRange } from '../utils/date';
import type { TransactionInsert, TransactionRow } from '../types/db';

// Todas las lecturas/escrituras quedan acotadas a [inicio, fin] del mes en curso:
// esto es lo que corrige el bug del prototipo donde el "resumen mensual" en
// realidad sumaba el histórico completo de transacciones.
export function useMonthlyTransactions(householdId: string | null) {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { start, end, label } = currentMonthRange();

  const reload = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('household_id', householdId)
      .gte('occurred_on', start)
      .lte('occurred_on', end)
      .order('occurred_on', { ascending: false });
    if (fetchError) setError(fetchError.message);
    else setTransactions(data ?? []);
    setLoading(false);
  }, [householdId, start, end]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function addTransaction(input: Omit<TransactionInsert, 'household_id'>) {
    if (!householdId) return { error: 'No hay household activo.' };
    const { error: insertError } = await supabase
      .from('transactions')
      .insert({ ...input, household_id: householdId });
    if (insertError) return { error: insertError.message };
    await reload();
    return { error: null };
  }

  async function deleteTransaction(id: string) {
    const { error: deleteError } = await supabase.from('transactions').delete().eq('id', id);
    if (deleteError) return { error: deleteError.message };
    await reload();
    return { error: null };
  }

  const gastos = transactions.filter((t) => t.kind === 'gasto');
  const ingresos = transactions.filter((t) => t.kind === 'ingreso');
  const totalGastos = gastos.reduce((acc, t) => acc + Number(t.monto), 0);
  const totalIngresos = ingresos.reduce((acc, t) => acc + Number(t.monto), 0);

  return {
    monthLabel: label,
    transactions,
    gastos,
    ingresos,
    totalGastos,
    totalIngresos,
    balance: totalIngresos - totalGastos,
    loading,
    error,
    addTransaction,
    deleteTransaction,
    reload,
  };
}
