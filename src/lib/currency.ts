// Monedas de la app: pesos dominicanos, dólares y euros.
// Las tasas son "pesos por 1 unidad" (DOP = 1) y las edita la persona en Preferencias.
// El símbolo "¤" en los textos significa "moneda base del hogar": se reemplaza al mostrarlos.

export type CurrencyCode = 'DOP' | 'USD' | 'EUR';

export interface CurrencyInfo {
  code: CurrencyCode;
  /** Prefijo con el que se escribe el monto. */
  symbol: string;
  name: string;
  /** Cómo se llama en cada idioma de la app. */
  names: { es: string; en: string; fr: string };
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  DOP: { code: 'DOP', symbol: 'RD$', name: 'Peso dominicano', names: { es: 'Peso dominicano', en: 'Dominican peso', fr: 'Peso dominicain' } },
  USD: { code: 'USD', symbol: 'US$', name: 'Dólar estadounidense', names: { es: 'Dólar estadounidense', en: 'US dollar', fr: 'Dollar américain' } },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', names: { es: 'Euro', en: 'Euro', fr: 'Euro' } },
};

export const CURRENCY_LIST: CurrencyInfo[] = [CURRENCIES.DOP, CURRENCIES.USD, CURRENCIES.EUR];

export const BASE_TOKEN = '¤';

export type Rates = Record<CurrencyCode, number>;

export const DEFAULT_RATES: Rates = { DOP: 1, USD: 60, EUR: 65 };

export function isCurrency(v: unknown): v is CurrencyCode {
  return v === 'DOP' || v === 'USD' || v === 'EUR';
}

// ── Estado global de la moneda base (lo actualiza CurrencyProvider) ──────────

let baseCode: CurrencyCode = 'DOP';
let rates: Rates = { ...DEFAULT_RATES };

export function setCurrencyState(base: CurrencyCode, nextRates: Partial<Rates> | null | undefined): void {
  baseCode = base;
  rates = normalizeRates(nextRates);
}

export function normalizeRates(r: Partial<Rates> | null | undefined): Rates {
  const usd = Number(r?.USD);
  const eur = Number(r?.EUR);
  return {
    DOP: 1,
    USD: usd > 0 ? usd : DEFAULT_RATES.USD,
    EUR: eur > 0 ? eur : DEFAULT_RATES.EUR,
  };
}

export function baseCurrency(): CurrencyCode {
  return baseCode;
}

export function baseSymbol(): string {
  return CURRENCIES[baseCode].symbol;
}

export function getRates(): Rates {
  return rates;
}

/** Cambia monto de una moneda a otra con las tasas indicadas (por defecto, las del hogar). */
export function convert(amount: number, from: CurrencyCode, to: CurrencyCode, r: Rates = rates): number {
  if (from === to) return amount;
  return (amount * r[from]) / r[to];
}

/** Redondeo a centavos, igual que la base de datos. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Monto en la moneda base del hogar. */
export function toBase(amount: number, from: CurrencyCode, r: Rates = rates): number {
  return convert(amount, from, baseCode, r);
}

export function numberText(n: number): string {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "US$ 1,200.00" — con el símbolo de la moneda indicada (por defecto, la base). */
export function formatCurrency(amount: number, code: CurrencyCode = baseCode, opts: { space?: boolean; sign?: boolean } = {}): string {
  const sym = CURRENCIES[code].symbol;
  const sep = opts.space ? ' ' : '';
  const sign = opts.sign ? (amount > 0 ? '+' : amount < 0 ? '−' : '') : amount < 0 ? '−' : '';
  return `${sign}${sym}${sep}${numberText(Math.abs(amount))}`;
}

/** Reemplaza el símbolo ¤ de un texto por el de la moneda base. */
export function applyBaseSymbol(text: string): string {
  return text.includes(BASE_TOKEN) ? text.split(BASE_TOKEN).join(baseSymbol()) : text;
}

/** Lo que vale 1 unidad de `code` en pesos, para mostrar la tasa ("1 US$ = RD$ 60.00"). */
export function rateLabel(code: CurrencyCode, r: Rates = rates): string {
  return `1 ${CURRENCIES[code].symbol} = ${CURRENCIES.DOP.symbol} ${numberText(r[code])}`;
}

export function parseAmount(v: string): number {
  return parseFloat(v.replace(/,/g, ''));
}

/** Monto de un movimiento (con su moneda) expresado en la moneda base del hogar. */
export function amountToBase(row: { monto?: number | string; amount?: number | string; moneda?: string | null }): number {
  const n = Number(row.monto ?? row.amount ?? 0);
  return isCurrency(row.moneda) ? toBase(n, row.moneda) : n;
}
