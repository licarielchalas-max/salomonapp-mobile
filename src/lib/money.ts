import type { AccountBalanceRow, PaymentMethod } from '../types/db';
import {
  baseCurrency,
  convert,
  formatCurrency,
  isCurrency,
  numberText,
  round2,
  type CurrencyCode,
} from './currency';

// Toda entrada o salida de dinero pasa por una cuenta: efectivo (uno por moneda) o una cuenta bancaria.
export type AccountRef = { kind: 'efectivo'; moneda: CurrencyCode } | { kind: 'banco'; id: string };

export function cashRef(moneda: CurrencyCode): AccountRef {
  return { kind: 'efectivo', moneda };
}

/** Efectivo en pesos (valor por defecto cuando no se sabe la moneda). */
export const CASH: AccountRef = cashRef('DOP');

/** Efectivo en la moneda base del hogar. */
export function baseCash(): AccountRef {
  return cashRef(baseCurrency());
}

export function refOf(a: Pick<AccountBalanceRow, 'kind' | 'bank_account_id'> & { moneda?: string | null }): AccountRef {
  if (a.kind === 'efectivo' || !a.bank_account_id) return cashRef(isCurrency(a.moneda) ? a.moneda : 'DOP');
  return { kind: 'banco', id: a.bank_account_id };
}

export function refKey(r: AccountRef | null): string {
  if (!r) return '';
  return r.kind === 'efectivo' ? `efectivo:${r.moneda}` : r.id;
}

export function sameRef(a: AccountRef | null, b: AccountRef | null): boolean {
  return refKey(a) === refKey(b);
}

/** Columnas medio + bank_account_id con las que se guarda un movimiento en esa cuenta. */
export function toDb(
  ref: AccountRef,
  bankMedio: PaymentMethod = 'transferencia',
): { medio: PaymentMethod; bank_account_id: string | null } {
  return ref.kind === 'efectivo'
    ? { medio: 'efectivo', bank_account_id: null }
    : { medio: bankMedio === 'efectivo' ? 'transferencia' : bankMedio, bank_account_id: ref.id };
}

/** Moneda con la que se guarda un movimiento: solo el efectivo la elige; el banco la define su cuenta. */
export function monedaFor(ref: AccountRef): { moneda?: CurrencyCode } {
  return ref.kind === 'efectivo' ? { moneda: ref.moneda } : {};
}

/** Cuenta con la que se registró un movimiento ya guardado (null si no tiene cuenta asignada). */
export function refFromDb(
  medio: PaymentMethod | null,
  bankAccountId: string | null,
  moneda?: string | null,
): AccountRef | null {
  if (medio === 'efectivo') return cashRef(isCurrency(moneda) ? moneda : 'DOP');
  return bankAccountId ? { kind: 'banco', id: bankAccountId } : null;
}

/** Orígenes de ingreso. La clave se guarda en transactions.income_source. */
export const INCOME_SOURCES = [
  { key: 'nomina', label: 'Nómina', icon: 'briefcase' },
  { key: 'servicio', label: 'Servicio prestado', icon: 'user' },
  { key: 'negocio', label: 'Negocio / ventas', icon: 'bag' },
  { key: 'alquiler', label: 'Alquiler cobrado', icon: 'home' },
  { key: 'inversion', label: 'Rendimientos', icon: 'trending' },
  { key: 'prestamo', label: 'Préstamo recibido', icon: 'bank' },
  { key: 'reembolso', label: 'Reembolso', icon: 'refresh' },
  { key: 'regalo', label: 'Regalo o ayuda', icon: 'gift' },
  { key: 'otro', label: 'Otro', icon: 'coin' },
] as const;

export type IncomeSourceKey = (typeof INCOME_SOURCES)[number]['key'];

export function incomeSourceLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  return INCOME_SOURCES.find((s) => s.key === key)?.label ?? key;
}

export function fmtMoney(n: number): string {
  return numberText(n);
}

/** Moneda de una cuenta (pesos si la fila no la trae). */
export function accountCurrency(a: Pick<AccountBalanceRow, 'moneda'> | undefined): CurrencyCode {
  return isCurrency(a?.moneda) ? a.moneda : 'DOP';
}

/** Saldo de una cuenta escrito en su propia moneda: "US$ 1,200.00". */
export function accountMoney(a: AccountBalanceRow, amount: number = a.saldo): string {
  return formatCurrency(amount, accountCurrency(a), { space: true });
}

/**
 * Monto en moneda base → monto en la moneda de la cuenta de la que sale el dinero.
 * Sin cuenta o con una cuenta en la moneda base, es el mismo monto.
 */
export function amountInAccount(a: AccountBalanceRow | undefined, amount: number, from: CurrencyCode = baseCurrency()): number {
  if (!a) return amount;
  const cur = accountCurrency(a);
  return cur === from ? amount : round2(convert(amount, from, cur));
}

/** Moneda de una deuda (la moneda base si no tiene una propia). */
export function debtCurrency(d: { moneda?: string | null } | undefined): CurrencyCode {
  return isCurrency(d?.moneda) ? d.moneda : baseCurrency();
}

/**
 * Columnas extra al guardar un pago en moneda base desde una cuenta: la moneda del efectivo
 * y cuánto sale realmente de la cuenta cuando está en otra moneda.
 */
export function fundingFor(
  a: AccountBalanceRow | undefined,
  amount: number,
  from: CurrencyCode = baseCurrency(),
  /** Lo que el banco realmente cobró en la moneda de la cuenta (si no, se calcula con las tasas). */
  actual?: number,
): { moneda?: CurrencyCode; monto_cuenta?: number } {
  if (!a) return {};
  const cur = accountCurrency(a);
  const out: { moneda?: CurrencyCode; monto_cuenta?: number } = {};
  if (a.kind === 'efectivo') out.moneda = cur;
  if (cur !== from) out.monto_cuenta = actual && actual > 0 ? round2(actual) : amountInAccount(a, amount, from);
  return out;
}

/** Mensaje si la cuenta no alcanza para `amount` (en la moneda de la cuenta); null si hay fondos. */
export function fundsError(balance: AccountBalanceRow | undefined, amount: number): string | null {
  if (!balance) return 'Elige la cuenta de donde sale el dinero.';
  if (amount > balance.saldo + 0.0001) {
    return `No tienes fondos suficientes en ${balance.nombre}. Disponible: ${accountMoney(balance, Math.max(balance.saldo, 0))}.`;
  }
  return null;
}

/** Igual que fundsError, pero el monto viene en moneda base y se convierte a la de la cuenta. */
export function fundsErrorBase(
  balance: AccountBalanceRow | undefined,
  amountBase: number,
  from: CurrencyCode = baseCurrency(),
  actual?: number,
): string | null {
  return fundsError(balance, actual && actual > 0 ? actual : amountInAccount(balance, amountBase, from));
}
