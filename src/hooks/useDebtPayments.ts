import { useCallback, useEffect, useState } from 'react';
import { useReloadOnFocus } from './useReloadOnFocus';
import { supabase } from '../lib/supabase';
import type { DebtPaymentRow, DebtPaymentInsert } from '../types/db';

export function useDebtPayments(debtId: string | null, isCard = false) {
  const [payments, setPayments] = useState<DebtPaymentRow[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!debtId) { setPayments([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('debt_payments')
      .select('*')
      .eq('debt_id', debtId)
      .order('occurred_on', { ascending: false });
    setPayments((data ?? []) as DebtPaymentRow[]);
    setLoading(false);
  }, [debtId]);

  useEffect(() => { reload(); }, [reload]);
  useReloadOnFocus(reload);

  async function recordPayment(input: Omit<DebtPaymentInsert, 'debt_id'> & { newSaldo: number }) {
    if (!debtId) return { error: 'No debt selected' };
    const { newSaldo, ...paymentData } = input;
    const { error: payErr } = await supabase
      .from('debt_payments')
      .insert({ ...paymentData, debt_id: debtId });
    if (payErr) return { error: payErr.message };
    // Update debt saldo
    const { error: debtErr } = await supabase
      .from('debts')
      .update({ saldo: newSaldo, status: newSaldo <= 0 && !isCard ? 'pagada' : 'pendiente' })
      .eq('id', debtId);
    if (debtErr) return { error: debtErr.message };
    await reload();
    return { error: null };
  }

  const totalPagado = payments.reduce((s, p) => s + Number(p.monto_total), 0);
  const totalCapital = payments.reduce((s, p) => s + Number(p.capital), 0);
  const totalInteres = payments.reduce((s, p) => s + Number(p.interes), 0);

  return { payments, loading, reload, recordPayment, totalPagado, totalCapital, totalInteres };
}
