import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useReloadOnFocus } from './useReloadOnFocus';
import type { LoanPayment } from '../lib/amortization';

/** Pagos de varios préstamos a la vez, agrupados por deuda (para calcular cuánto llevas ahorrado en intereses). */
export function useLoanPayments(debtIds: string[]) {
  const key = debtIds.join(',');
  const ids = useMemo(() => (key ? key.split(',') : []), [key]);
  const [byDebt, setByDebt] = useState<Record<string, LoanPayment[]>>({});

  const reload = useCallback(async () => {
    if (!ids.length) { setByDebt({}); return; }
    const { data } = await supabase
      .from('debt_payments')
      .select('debt_id, occurred_on, created_at, monto_total, interes, capital, saldo_anterior, saldo_nuevo')
      .in('debt_id', ids);
    const grouped: Record<string, LoanPayment[]> = {};
    for (const r of (data ?? []) as (LoanPayment & { debt_id: string })[]) {
      (grouped[r.debt_id] ??= []).push(r);
    }
    setByDebt(grouped);
  }, [ids]);

  useEffect(() => { reload(); }, [reload]);
  useReloadOnFocus(reload);

  return { byDebt, reload };
}
