import { useCallback, useEffect, useState } from 'react';
import { useReloadOnFocus } from './useReloadOnFocus';
import { supabase } from '../lib/supabase';
import { toDb, type AccountRef } from '../lib/money';
import { emitRemindersChanged } from '../lib/reminderBus';
import type { ScheduledExpenseRow, ScheduledExpenseInsert } from '../types/db';

export function useScheduledExpenses(householdId: string | null) {
  const [expenses, setExpenses] = useState<ScheduledExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!householdId) {
      setExpenses([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('scheduled_expenses')
      .select('*')
      .eq('household_id', householdId)
      .order('fecha_pago', { ascending: true });
    setExpenses(data ?? []);
    setLoading(false);
  }, [householdId]);

  useEffect(() => { reload(); }, [reload]);
  useReloadOnFocus(reload);

  async function addExpense(input: Omit<ScheduledExpenseInsert, 'household_id'>) {
    if (!householdId) return { error: 'No hay sesión activa.' };
    const { error } = await supabase
      .from('scheduled_expenses')
      .insert({ ...input, household_id: householdId });
    if (!error) {
      await reload();
      emitRemindersChanged();
    }
    return { error: error?.message ?? null };
  }

  // Paga el gasto desde una cuenta: crea el gasto en Movimientos, descuenta de la cuenta y marca
  // el pago, todo en un solo paso. Si la cuenta no tiene fondos, no se registra nada.
  async function markPaid(id: string, account: AccountRef) {
    const { medio, bank_account_id } = toDb(account);
    // El gasto está en moneda base; el efectivo indica en qué moneda se paga.
    const { error } = await supabase.rpc('pay_scheduled_expense', {
      p_id: id,
      p_medio: medio,
      p_bank: bank_account_id,
      ...(account.kind === 'efectivo' ? { p_moneda: account.moneda } : {}),
    });
    if (!error) {
      await reload();
      emitRemindersChanged();
    }
    return { error: error?.message ?? null };
  }

  async function deleteExpense(id: string) {
    const { error } = await supabase.from('scheduled_expenses').delete().eq('id', id);
    if (!error) {
      await reload();
      emitRemindersChanged();
    }
    return { error: error?.message ?? null };
  }

  // Cambia los datos de un pago pendiente (nombre, monto, fecha, aviso o repetición).
  async function updateExpense(id: string, changes: Partial<Omit<ScheduledExpenseInsert, 'household_id'>>) {
    const { error } = await supabase.from('scheduled_expenses').update(changes as never).eq('id', id);
    if (!error) {
      await reload();
      emitRemindersChanged();
    }
    return { error: error?.message ?? null };
  }

  // Pospone el pago: mueve el vencimiento (y con él el aviso) a la nueva fecha.
  async function postpone(id: string, newDate: string) {
    const current = expenses.find((e) => e.id === id);
    const { error } = await supabase
      .from('scheduled_expenses')
      .update({ fecha_pago: newDate, pospuesto_veces: (current?.pospuesto_veces ?? 0) + 1 })
      .eq('id', id);
    if (!error) {
      await reload();
      emitRemindersChanged();
    }
    return { error: error?.message ?? null };
  }

  // Cambia el aviso, la hora o la repetición de un pago ya programado.
  async function updateReminder(
    id: string,
    changes: Partial<Pick<ScheduledExpenseRow, 'aviso_dias_antes' | 'hora_aviso' | 'recurrencia'>>,
  ) {
    const { error } = await supabase.from('scheduled_expenses').update(changes as never).eq('id', id);
    if (!error) {
      await reload();
      emitRemindersChanged();
    }
    return { error: error?.message ?? null };
  }

  const pending = expenses.filter((e) => e.status === 'pendiente');
  const paid = expenses.filter((e) => e.status === 'pagado');
  const totalPending = pending.reduce((acc, e) => acc + Number(e.monto), 0);

  return { expenses, pending, paid, loading, addExpense, markPaid, deleteExpense, updateExpense, postpone, updateReminder, totalPending, reload };
}
