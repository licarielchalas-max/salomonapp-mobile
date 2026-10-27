import { fetchMarketRates, parseMarketRates, ratesAreStale } from '../rates';

const OK = { result: 'success', rates: { DOP: 61.211971, EUR: 0.892629, USD: 1 } };

describe('tasas de mercado', () => {
  it('convierte la respuesta en pesos por dólar y por euro', () => {
    expect(parseMarketRates(OK)).toEqual({ USD: 61.21, EUR: 68.57 });
  });

  it('rechaza respuestas incompletas o con valores absurdos', () => {
    expect(parseMarketRates(null)).toBeNull();
    expect(parseMarketRates({ result: 'error' })).toBeNull();
    expect(parseMarketRates({ result: 'success', rates: { DOP: 0, EUR: 0.9 } })).toBeNull();
    expect(parseMarketRates({ result: 'success', rates: { DOP: 61, EUR: 0 } })).toBeNull();
    expect(parseMarketRates({ result: 'success', rates: { DOP: 61 } })).toBeNull();
  });

  it('pide las tasas y devuelve null si falla la red', async () => {
    const good = (async () => ({ ok: true, json: async () => OK })) as unknown as typeof fetch;
    const bad = (async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
    const boom = (async () => { throw new Error('sin red'); }) as unknown as typeof fetch;
    expect(await fetchMarketRates(good)).toEqual({ USD: 61.21, EUR: 68.57 });
    expect(await fetchMarketRates(bad)).toBeNull();
    expect(await fetchMarketRates(boom)).toBeNull();
  });

  it('sabe cuándo las tasas están vencidas', () => {
    const now = new Date('2026-10-11T12:00:00Z');
    expect(ratesAreStale(null, now)).toBe(true);
    expect(ratesAreStale('2026-10-11T10:00:00Z', now)).toBe(false);
    expect(ratesAreStale('2026-10-11T05:00:00Z', now)).toBe(true);
    expect(ratesAreStale('basura', now)).toBe(true);
  });
});
