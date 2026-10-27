import { useCallback, useEffect, useState } from 'react';
import { useReloadOnFocus } from './useReloadOnFocus';
import { supabase } from '../lib/supabase';
import { emitRemindersChanged } from '../lib/reminderBus';
import { debtCurrency } from '../lib/money';
import { toBase, type CurrencyCode } from '../lib/currency';
import type { DebtRow, DebtInsert } from '../types/db';

export function useDebts(householdId: string | null) {
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!householdId) {
      setDebts([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('debts')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });
    setDebts(data ?? []);
    setLoading(false);
  }, [householdId]);

  useEffect(() => { reload(); }, [reload]);
  useReloadOnFocus(reload);

  async function addDebt(input: Omit<DebtInsert, 'household_id'>) {
    if (!householdId) return { error: 'No hay sesión activa.' };
    const { error } = await supabase
      .from('debts')
      .insert({ ...input, household_id: householdId });
    if (!error) {
      await reload();
      emitRemindersChanged();
    }
    return { error: error?.message ?? null };
  }

  async function updateDebt(id: string, input: Partial<Omit<DebtInsert, 'household_id'>>) {
    const { error } = await supabase.from('debts').update(input as never).eq('id', id);
    if (!error) {
      await reload();
      emitRemindersChanged();
    }
    return { error: error?.message ?? null };
  }

  async function deleteDebt(id: string) {
    const { error } = await supabase.from('debts').delete().eq('id', id);
    if (!error) {
      await reload();
      emitRemindersChanged();
    }
    return { error: error?.message ?? null };
  }

  // Totales en moneda base: cada deuda se convierte desde su propia moneda.
  const active = debts.filter((d) => d.status !== 'pagada');
  const totalDeuda = active.reduce((acc, d) => acc + toBase(Number(d.saldo), debtCurrency(d)), 0);
  const totalCuotaMensual = active.reduce((acc, d) => acc + toBase(Number(d.cuota_mensual), debtCurrency(d)), 0);
  const totalInteresAnual = active.reduce((acc, d) => acc + toBase((Number(d.saldo) * Number(d.tasa_anual)) / 100, debtCurrency(d)), 0);
  // Lo que se debe en cada moneda, sin convertir: "RD$ 35,000 + US$ 200".
  const totalsByCurrency = (() => {
    const map = new Map<CurrencyCode, number>();
    for (const d of active) {
      if (Number(d.saldo) <= 0) continue;
      map.set(debtCurrency(d), (map.get(debtCurrency(d)) ?? 0) + Number(d.saldo));
    }
    return [...map.entries()].map(([moneda, saldo]) => ({ moneda, saldo }));
  })();

  return { debts, loading, addDebt, updateDebt, deleteDebt, totalDeuda, totalCuotaMensual, totalInteresAnual, totalsByCurrency, reload };
}
