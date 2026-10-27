import type { IconName } from '../components/brand/Icon';
import type { AccountBalanceRow, AccountLedgerRow, CurrencyCodeDb, LedgerSource } from '../types/db';

export const SOURCE_ICON: Record<LedgerSource, IconName> = {
  ingreso: 'down',
  gasto: 'up',
  deuda: 'card',
  meta: 'target',
  inversion: 'trending',
  presupuesto_abono: 'wallet',
  presupuesto_retiro: 'wallet',
  transferencia_salida: 'refresh',
  transferencia_entrada: 'refresh',
};

export const SOURCE_BADGE: Record<LedgerSource, string> = {
  ingreso: 'INGRESO',
  gasto: 'GASTO',
  deuda: 'DEUDA',
  meta: 'META',
  inversion: 'INVERSIÓN',
  presupuesto_abono: 'PRESUPUESTO',
  presupuesto_retiro: 'PRESUPUESTO',
  transferencia_salida: 'TRANSFERENCIA',
  transferencia_entrada: 'TRANSFERENCIA',
};

export interface LedgerItemData {
  key: string;
  source: LedgerSource;
  label: string;
  /** Con signo: positivo entra a la cuenta, negativo sale. En transferencias, el monto transferido. */
  amount: number;
  /** Moneda del monto (la de la cuenta afectada). */
  moneda: CurrencyCodeDb;
  occurred_on: string;
  created_at: string;
  /** Cuenta afectada. En una transferencia, la de origen. */
  account: string;
  /** Solo transferencias: cuenta de destino. */
  accountTo?: string;
  /** Solo transferencias entre monedas distintas: lo que recibió la cuenta de destino. */
  amountTo?: number;
  monedaTo?: CurrencyCodeDb;
}

type NamedAccount = Pick<AccountBalanceRow, 'bank_account_id' | 'nombre'> & Partial<Pick<AccountBalanceRow, 'kind' | 'moneda'>>;

export function accountName(
  row: Pick<AccountLedgerRow, 'is_cash' | 'bank_account_id'> & { moneda?: string },
  accounts: NamedAccount[],
): string {
  if (row.is_cash) {
    return accounts.find((a) => a.kind === 'efectivo' && a.moneda === row.moneda)?.nombre ?? 'Efectivo';
  }
  return accounts.find((a) => a.bank_account_id === row.bank_account_id)?.nombre ?? 'Cuenta';
}

/**
 * Convierte filas del libro en elementos para mostrar. Cada transferencia genera dos filas
 * (salida y entrada); aquí se unen en una sola: "Efectivo → Banco".
 */
export function toLedgerItems(
  rows: AccountLedgerRow[],
  accounts: NamedAccount[],
): LedgerItemData[] {
  const items: LedgerItemData[] = [];
  const transfers = new Map<string, { out?: AccountLedgerRow; inn?: AccountLedgerRow }>();

  for (const r of rows) {
    if (r.source === 'transferencia_salida' || r.source === 'transferencia_entrada') {
      const t = transfers.get(r.ref_id) ?? {};
      if (r.source === 'transferencia_salida') t.out = r;
      else t.inn = r;
      transfers.set(r.ref_id, t);
      continue;
    }
    items.push({
      key: `${r.source}-${r.ref_id}`,
      source: r.source,
      label: r.label,
      amount: Number(r.amount),
      moneda: r.moneda ?? 'DOP',
      occurred_on: r.occurred_on,
      created_at: r.created_at,
      account: accountName(r, accounts),
    });
  }

  transfers.forEach((t, id) => {
    const base = t.out ?? t.inn;
    if (!base) return;
    items.push({
      key: `transferencia-${id}`,
      source: 'transferencia_salida',
      label: 'Transferencia entre cuentas',
      amount: Math.abs(Number(base.amount)),
      moneda: base.moneda ?? 'DOP',
      occurred_on: base.occurred_on,
      created_at: base.created_at,
      account: t.out ? accountName(t.out, accounts) : '—',
      accountTo: t.inn ? accountName(t.inn, accounts) : '—',
      // Entre monedas distintas se muestra también lo que recibió la cuenta de destino.
      ...(t.out && t.inn && t.out.moneda !== t.inn.moneda
        ? { amountTo: Math.abs(Number(t.inn.amount)), monedaTo: t.inn.moneda }
        : {}),
    });
  });

  return items.sort((a, b) =>
    a.occurred_on === b.occurred_on ? b.created_at.localeCompare(a.created_at) : b.occurred_on.localeCompare(a.occurred_on),
  );
}
