import {
  CURRENCIES,
  DEFAULT_RATES,
  applyBaseSymbol,
  baseSymbol,
  convert,
  formatCurrency,
  isCurrency,
  normalizeRates,
  rateLabel,
  round2,
  setCurrencyState,
  toBase,
} from '../currency';

afterEach(() => setCurrencyState('DOP', DEFAULT_RATES));

describe('monedas', () => {
  it('reconoce los códigos válidos', () => {
    expect(['DOP', 'USD', 'EUR'].every(isCurrency)).toBe(true);
    expect(isCurrency('GBP')).toBe(false);
    expect(isCurrency(null)).toBe(false);
  });

  it('convierte entre monedas con tasas en pesos', () => {
    const r = { DOP: 1, USD: 60, EUR: 66 };
    expect(convert(10, 'USD', 'DOP', r)).toBe(600);
    expect(convert(600, 'DOP', 'USD', r)).toBe(10);
    expect(convert(10, 'EUR', 'USD', r)).toBeCloseTo(11);
    expect(convert(5, 'USD', 'USD', r)).toBe(5);
    expect(round2(convert(1200, 'DOP', 'USD', r))).toBe(20);
  });

  it('normaliza tasas inválidas a las predeterminadas', () => {
    expect(normalizeRates({ USD: 0, EUR: -3 })).toEqual({ DOP: 1, USD: DEFAULT_RATES.USD, EUR: DEFAULT_RATES.EUR });
    expect(normalizeRates({ USD: 58.5 }).USD).toBe(58.5);
    expect(normalizeRates(null).DOP).toBe(1);
  });
});

describe('formato y moneda base', () => {
  it('muestra el símbolo de cada moneda', () => {
    expect(formatCurrency(1200, 'USD')).toBe('US$1,200.00');
    expect(formatCurrency(1200, 'EUR', { space: true })).toBe('€ 1,200.00');
    expect(formatCurrency(-50, 'DOP')).toBe('−RD$50.00');
    expect(formatCurrency(50, 'DOP', { sign: true })).toBe('+RD$50.00');
  });

  it('cambiar la moneda base cambia el símbolo ¤ y las conversiones a base', () => {
    expect(baseSymbol()).toBe('RD$');
    expect(applyBaseSymbol('Debes ¤1,000.00')).toBe('Debes RD$1,000.00');
    setCurrencyState('USD', { USD: 60, EUR: 65 });
    expect(baseSymbol()).toBe('US$');
    expect(applyBaseSymbol('Debes ¤10.00')).toBe('Debes US$10.00');
    expect(toBase(600, 'DOP')).toBe(10);
    expect(toBase(10, 'USD')).toBe(10);
  });

  it('describe la tasa', () => {
    expect(rateLabel('USD', { DOP: 1, USD: 58.5, EUR: 65 })).toBe('1 US$ = RD$ 58.50');
    expect(CURRENCIES.EUR.symbol).toBe('€');
  });
});
