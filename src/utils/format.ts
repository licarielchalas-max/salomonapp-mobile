export function formatMoney(amount: number, currency: string = 'RD$'): string {
  return `${currency} ${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
