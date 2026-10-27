import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useReloadOnFocus } from './useReloadOnFocus';
import { refKey, refOf, type AccountRef } from '../lib/money';
import { isCurrency, toBase } from '../lib/currency';
import type { AccountBalanceRow } from '../types/db';

// Cuentas del hogar con su saldo real (efectivo + bancos), calculado en la base de datos
// a partir de todos los movimientos. Se recarga al volver a la pantalla.
export function useAccounts(householdId: string | null) {
  const [accounts, setAccounts] = useState<AccountBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!householdId) {
      setAccounts([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('account_balances')
      .select('*')
      .eq('household_id', householdId);
    const rows = ((data ?? []) as AccountBalanceRow[]).map((r) => ({ ...r, saldo: Number(r.saldo), moneda: isCurrency(r.moneda) ? r.moneda : 'DOP' }));
    // Efectivo primero, luego los bancos por nombre.
    rows.sort((a, b) => (a.kind === b.kind ? a.nombre.localeCompare(b.nombre) : a.kind === 'efectivo' ? -1 : 1));
    setAccounts(rows);
    setLoading(false);
  }, [householdId]);

  useEffect(() => { reload(); }, [reload]);
  useReloadOnFocus(reload);

  // Total en moneda base: cada cuenta se convierte con las tasas del hogar.
  const total = useMemo(
    () => accounts.reduce((s, a) => s + (isCurrency(a.moneda) ? toBase(a.saldo, a.moneda) : a.saldo), 0),
    [accounts],
  );

  const find = useCallback(
    (ref: AccountRef | null) => (ref ? accounts.find((a) => refKey(refOf(a)) === refKey(ref)) : undefined),
    [accounts],
  );

  return { accounts, total, loading, reload, find };
}
