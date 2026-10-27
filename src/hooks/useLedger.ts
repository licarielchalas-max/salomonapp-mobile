import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useReloadOnFocus } from './useReloadOnFocus';
import type { AccountRef } from '../lib/money';
import type { AccountLedgerRow } from '../types/db';

interface Options {
  /** Fechas YYYY-MM-DD (inclusive). */
  from?: string;
  to?: string;
  /** Solo los movimientos de una cuenta. */
  account?: AccountRef | null;
  limit?: number;
  /** false = no consulta (por ejemplo, mientras una hoja está cerrada). */
  enabled?: boolean;
}

// Libro de movimientos de dinero: ingresos, gastos, deudas, metas, inversiones,
// presupuestos y transferencias, cada uno con la cuenta que afectó.
export function useLedger(householdId: string | null, opts: Options = {}) {
  const { from, to, account = null, limit, enabled = true } = opts;
  const [rows, setRows] = useState<AccountLedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const accountKey = account ? (account.kind === 'efectivo' ? `efectivo:${account.moneda}` : account.id) : '';

  const reload = useCallback(async () => {
    if (!householdId || !enabled) {
      setLoading(false);
      return;
    }
    let q = supabase.from('account_ledger').select('*').eq('household_id', householdId);
    if (from) q = q.gte('occurred_on', from);
    if (to) q = q.lte('occurred_on', to);
    if (account) q = account.kind === 'efectivo' ? q.eq('is_cash', true).eq('moneda', account.moneda) : q.eq('is_cash', false).eq('bank_account_id', account.id);
    q = q.order('occurred_on', { ascending: false }).order('created_at', { ascending: false });
    if (limit) q = q.limit(limit);
    const { data } = await q;
    setRows(((data ?? []) as AccountLedgerRow[]).map((r) => ({ ...r, amount: Number(r.amount) })));
    setLoading(false);
  }, [householdId, enabled, from, to, accountKey, limit]);

  useEffect(() => { reload(); }, [reload]);
  useReloadOnFocus(reload);

  return { rows, loading, reload };
}
