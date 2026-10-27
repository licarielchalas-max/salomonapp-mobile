import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useReloadOnFocus } from './useReloadOnFocus';
import { addDays, toISODate } from '../lib/reminders';
import { cardsAsDebtDates, type CardDates, type DebtDates, type DebtPaymentDate } from '../lib/debtDates';

export interface DebtSchedule {
  /** Deudas y tarjetas con fechas de pago. */
  items: DebtDates[];
  payments: DebtPaymentDate[];
}

/** Carga deudas, tarjetas y pagos recientes para calcular vencimientos. */
export async function loadDebtSchedule(householdId: string): Promise<DebtSchedule> {
  const since = addDays(toISODate(new Date()), -120);
  const [d, c] = await Promise.all([
    supabase.from('debts').select('*').eq('household_id', householdId),
    supabase.from('cards').select('*').eq('household_id', householdId),
  ]);
  const debts = (d.data ?? []) as unknown as (DebtDates & { card_id: string | null })[];
  const cards = (c.data ?? []) as unknown as CardDates[];
  const ids = debts.map((x) => x.id);
  let payments: DebtPaymentDate[] = [];
  if (ids.length) {
    const { data } = await supabase.from('debt_payments').select('debt_id, occurred_on').in('debt_id', ids).gte('occurred_on', since);
    payments = (data ?? []) as DebtPaymentDate[];
  }
  return {
    items: [
      ...debts.map((x) => ({
        ...x,
        tipo: x.tipo ?? 'otro',
        cuota_mensual: Number(x.cuota_mensual),
        saldo: Number(x.saldo),
        dia_corte: x.dia_corte ?? null,
        dia_pago: x.dia_pago ?? null,
        aviso_dias_antes: x.aviso_dias_antes ?? null,
      })),
      ...cardsAsDebtDates(cards, debts),
    ],
    payments,
  };
}

export function useDebtSchedule(householdId: string | null) {
  const [schedule, setSchedule] = useState<DebtSchedule>({ items: [], payments: [] });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!householdId) {
      setSchedule({ items: [], payments: [] });
      setLoading(false);
      return;
    }
    setSchedule(await loadDebtSchedule(householdId));
    setLoading(false);
  }, [householdId]);

  useEffect(() => { reload(); }, [reload]);
  useReloadOnFocus(reload);

  return { ...schedule, loading, reload };
}
