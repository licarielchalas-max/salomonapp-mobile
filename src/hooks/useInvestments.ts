import { useEffect, useState, useCallback } from 'react';
import { useReloadOnFocus } from './useReloadOnFocus';
import { supabase } from '../lib/supabase';
import { toDb, type AccountRef } from '../lib/money';
import type { InvestmentRow, InvestmentInsert, InvestmentType } from '../types/db';

export function useInvestments(householdId: string | null) {
  const [investments, setInvestments] = useState<InvestmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!householdId) { setLoading(false); return; }
    const { data } = await supabase
      .from('investments')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });
    setInvestments((data ?? []) as InvestmentRow[]);
    setLoading(false);
  }, [householdId]);

  useEffect(() => { load(); }, [load]);
  useReloadOnFocus(load);

  const totalInvertido = investments.reduce((a, i) => a + Number(i.cantidad) * Number(i.precio_compra), 0);
  const totalActual = investments.reduce((a, i) => a + Number(i.cantidad) * Number(i.precio_actual), 0);
  const ganancia = totalActual - totalInvertido;
  const rendimiento = totalInvertido > 0 ? (ganancia / totalInvertido) * 100 : 0;

  // La compra sale de una cuenta; la base de datos rechaza la compra si no hay fondos.
  async function addInvestment(input: Omit<InvestmentInsert, 'household_id'>, account: AccountRef, funding: Record<string, unknown> = {}) {
    if (!householdId) return { error: 'Sin sesión' };
    const { error } = await supabase.from('investments').insert({
      ...input,
      ...toDb(account),
      ...funding,
      household_id: householdId,
      precio_actual: input.precio_actual ?? input.precio_compra,
    });
    if (!error) await load();
    return { error: error?.message ?? null };
  }

  // Corrige los datos de una inversión. Si cambia cantidad o precio de compra, el dinero
  // pagado se recalcula en la cuenta de origen (y se rechaza si ya no alcanza).
  async function updateInvestment(id: string, changes: Partial<Omit<InvestmentInsert, 'household_id'>>) {
    const { error } = await supabase.from('investments').update(changes as never).eq('id', id);
    if (!error) await load();
    return { error: error?.message ?? null };
  }

  async function updatePrice(id: string, precio_actual: number) {
    await supabase.from('investments').update({ precio_actual }).eq('id', id);
    setInvestments((p) => p.map((i) => i.id === id ? { ...i, precio_actual } : i));
  }

  async function deleteInvestment(id: string) {
    await supabase.from('investments').delete().eq('id', id);
    setInvestments((p) => p.filter((i) => i.id !== id));
  }

  return { investments, loading, totalInvertido, totalActual, ganancia, rendimiento, addInvestment, updateInvestment, updatePrice, deleteInvestment, reload: load };
}
