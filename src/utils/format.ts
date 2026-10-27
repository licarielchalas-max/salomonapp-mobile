import { baseSymbol } from '../lib/currency';
export function formatMoney(amount: number, currency: string = baseSymbol()): string {
  return `${currency} ${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

