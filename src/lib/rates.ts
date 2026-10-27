// Tasas de cambio de mercado, en pesos por 1 unidad (dólar y euro), desde un servicio gratuito.
// Es la tasa de mercado: cada banco aplica la suya al cobrar, por eso al pagar se puede escribir
// lo que el banco cobró de verdad.

export const RATES_URL = 'https://open.er-api.com/v6/latest/USD';
export const RATES_SOURCE = 'open.er-api.com';
/** Cada cuántas horas se vuelven a pedir las tasas. */
export const RATES_MAX_AGE_HOURS = 6;

export interface MarketRates {
  USD: number;
  EUR: number;
}

/** Convierte la respuesta del servicio (base USD) en pesos por dólar y pesos por euro. */
export function parseMarketRates(json: unknown): MarketRates | null {
  const rates = (json as { result?: string; rates?: Record<string, number> } | null)?.rates;
  if ((json as { result?: string } | null)?.result !== 'success' || !rates) return null;
  const dop = Number(rates.DOP);
  const eur = Number(rates.EUR);
  if (!(dop > 1 && dop < 1000) || !(eur > 0.1 && eur < 10)) return null;
  const round = (n: number) => Math.round(n * 100) / 100;
  return { USD: round(dop), EUR: round(dop / eur) };
}

export async function fetchMarketRates(fetcher: typeof fetch = fetch): Promise<MarketRates | null> {
  try {
    const res = await fetcher(RATES_URL);
    if (!res.ok) return null;
    return parseMarketRates(await res.json());
  } catch {
    return null;
  }
}

/** ¿Pasaron más de `hours` horas desde la última actualización? */
export function ratesAreStale(updatedAt: string | null | undefined, now: Date = new Date(), hours = RATES_MAX_AGE_HOURS): boolean {
  if (!updatedAt) return true;
  const t = new Date(updatedAt).getTime();
  return isNaN(t) || now.getTime() - t > hours * 3600 * 1000;
}
