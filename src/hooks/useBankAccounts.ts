import { useEffect, useState, useCallback } from 'react';
import { useReloadOnFocus } from './useReloadOnFocus';
import { supabase } from '../lib/supabase';
import { emitRemindersChanged } from '../lib/reminderBus';
import type { BankAccountRow, BankAccountInsert, CardRow, CardInsert } from '../types/db';

export function useBankAccounts(householdId: string | null) {
  const [accounts, setAccounts] = useState<BankAccountRow[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!householdId) { setLoading(false); return; }
    const [{ data: accs }, { data: cds }] = await Promise.all([
      supabase.from('bank_accounts').select('*').eq('household_id', householdId).order('created_at'),
      supabase.from('cards').select('*').eq('household_id', householdId).order('created_at'),
    ]);
    setAccounts((accs ?? []) as BankAccountRow[]);
    setCards((cds ?? []) as CardRow[]);
    setLoading(false);
  }, [householdId]);

  useEffect(() => { load(); }, [load]);
  useReloadOnFocus(load);

  async function addAccount(input: Omit<BankAccountInsert, 'household_id'>) {
    if (!householdId) return { error: 'Sin sesión' };
    const { error } = await supabase.from('bank_accounts').insert({ ...input, household_id: householdId });
    if (!error) await load();
    return { error: error?.message ?? null };
  }

  async function updateAccount(id: string, changes: Partial<Omit<BankAccountInsert, 'household_id'>>) {
    const { error } = await supabase.from('bank_accounts').update(changes as never).eq('id', id);
    if (!error) await load();
    return { error: error?.message ?? null };
  }

  async function deleteAccount(id: string) {
    const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
    if (error) {
      const inUse = error.code === '23503' || /foreign key|restrict/i.test(error.message);
      return {
        error: inUse
          ? 'Esta cuenta tiene movimientos registrados y no se puede eliminar. Transfiere su saldo a otra cuenta y deja de usarla.'
          : error.message,
      };
    }
    setAccounts((p) => p.filter((a) => a.id !== id));
    return { error: null };
  }

  /** Ajusta el saldo inicial para que el saldo actual de la cuenta sea `target`. */
  async function adjustBalance(id: string, currentSaldo: number, target: number) {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return { error: 'Cuenta no encontrada' };
    const nuevoInicial = Number(acc.saldo_inicial ?? 0) + (target - currentSaldo);
    const { error } = await supabase.from('bank_accounts').update({ saldo_inicial: nuevoInicial }).eq('id', id);
    if (!error) await load();
    return { error: error?.message ?? null };
  }

  async function addCard(input: Omit<CardInsert, 'household_id'>) {
    if (!householdId) return { error: 'Sin sesión' };
    const { error } = await supabase.from('cards').insert({ ...input, household_id: householdId });
    if (!error) await load();
    return { error: error?.message ?? null };
  }

  async function updateCard(id: string, changes: Partial<Omit<CardInsert, 'household_id'>>) {
    const { error } = await supabase.from('cards').update(changes as never).eq('id', id);
    if (!error) {
      await load();
      emitRemindersChanged();
    }
    return { error: error?.message ?? null };
  }

  async function deleteCard(id: string) {
    await supabase.from('cards').delete().eq('id', id);
    setCards((p) => p.filter((c) => c.id !== id));
  }

  return { accounts, cards, loading, addAccount, updateAccount, deleteAccount, adjustBalance, addCard, updateCard, deleteCard, reload: load };
}
