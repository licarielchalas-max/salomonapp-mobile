import {
  CASH,
  INCOME_SOURCES,
  amountInAccount,
  cashRef,
  fundingFor,
  fundsError,
  fundsErrorBase,
  incomeSourceLabel,
  refFromDb,
  refKey,
  refOf,
  sameRef,
  toDb,
} from '../money';
import { DEFAULT_RATES, setCurrencyState } from '../currency';
import type { AccountBalanceRow } from '../../types/db';

const cash: AccountBalanceRow = { household_id: 'h', kind: 'efectivo', bank_account_id: null, nombre: 'Efectivo', saldo: 500, moneda: 'DOP' };
const bank: AccountBalanceRow = { household_id: 'h', kind: 'banco', bank_account_id: 'b1', nombre: 'Banco Popular ···1234', saldo: 1200, moneda: 'DOP' };
const usdBank: AccountBalanceRow = { household_id: 'h', kind: 'banco', bank_account_id: 'b2', nombre: 'Banreservas (US$)', saldo: 100, moneda: 'USD' };
const usdCash: AccountBalanceRow = { household_id: 'h', kind: 'efectivo', bank_account_id: null, nombre: 'Efectivo US$', saldo: 40, moneda: 'USD' };

afterEach(() => setCurrencyState('DOP', DEFAULT_RATES));

describe('cuentas', () => {
  it('convierte una cuenta en referencia y clave', () => {
    expect(refOf(cash)).toEqual(CASH);
    expect(refOf(bank)).toEqual({ kind: 'banco', id: 'b1' });
    expect(refKey(refOf(bank))).toBe('b1');
    expect(refKey(CASH)).toBe('efectivo:DOP');
    expect(sameRef(refOf(bank), { kind: 'banco', id: 'b1' })).toBe(true);
    expect(sameRef(CASH, refOf(bank))).toBe(false);
  });

  it('el efectivo se lleva por moneda', () => {
    expect(refOf(usdCash)).toEqual(cashRef('USD'));
    expect(sameRef(refOf(usdCash), CASH)).toBe(false);
    expect(refKey(refOf(usdCash))).toBe('efectivo:USD');
  });

  it('guarda efectivo sin cuenta bancaria y el banco con su id', () => {
    expect(toDb(CASH)).toEqual({ medio: 'efectivo', bank_account_id: null });
    expect(toDb({ kind: 'banco', id: 'b1' })).toEqual({ medio: 'transferencia', bank_account_id: 'b1' });
    expect(toDb({ kind: 'banco', id: 'b1' }, 'tarjeta')).toEqual({ medio: 'tarjeta', bank_account_id: 'b1' });
    // Una cuenta bancaria nunca se guarda como efectivo.
    expect(toDb({ kind: 'banco', id: 'b1' }, 'efectivo').medio).toBe('transferencia');
  });

  it('reconstruye la cuenta de un movimiento guardado', () => {
    expect(refFromDb('efectivo', null)).toEqual(CASH);
    expect(refFromDb('efectivo', null, 'EUR')).toEqual(cashRef('EUR'));
    expect(refFromDb('transferencia', 'b1')).toEqual({ kind: 'banco', id: 'b1' });
    expect(refFromDb('tarjeta', null)).toBeNull();
    expect(refFromDb(null, null)).toBeNull();
  });
});

describe('fundsError', () => {
  it('permite el monto igual o menor al saldo', () => {
    expect(fundsError(cash, 500)).toBeNull();
    expect(fundsError(bank, 100)).toBeNull();
  });

  it('avisa cuando no alcanza y dice cuánto hay', () => {
    const msg = fundsError(cash, 500.01);
    expect(msg).toContain('No tienes fondos suficientes en Efectivo');
    expect(msg).toContain('500.00');
  });

  it('exige elegir una cuenta', () => {
    expect(fundsError(undefined, 10)).toMatch(/Elige la cuenta/);
  });

  it('no muestra saldo negativo como disponible', () => {
    expect(fundsError({ ...cash, saldo: -30 }, 10)).toContain('RD$ 0.00');
  });

  it('muestra el disponible en la moneda de la cuenta', () => {
    expect(fundsError(usdBank, 150)).toContain('US$ 100.00');
  });
});

describe('pagos desde una cuenta en otra moneda', () => {
  it('convierte el monto en moneda base a la moneda de la cuenta', () => {
    setCurrencyState('DOP', { USD: 60, EUR: 65 });
    expect(amountInAccount(usdBank, 1200)).toBe(20);
    expect(amountInAccount(bank, 1200)).toBe(1200);
    expect(amountInAccount(undefined, 1200)).toBe(1200);
  });

  it('valida fondos con el monto convertido', () => {
    setCurrencyState('DOP', { USD: 60, EUR: 65 });
    expect(fundsErrorBase(usdBank, 6000)).toBeNull(); // US$100 justos
    expect(fundsErrorBase(usdBank, 6060)).toContain('No tienes fondos suficientes');
  });

  it('indica moneda y monto real que sale de la cuenta', () => {
    setCurrencyState('DOP', { USD: 60, EUR: 65 });
    expect(fundingFor(usdBank, 1200)).toEqual({ monto_cuenta: 20 });
    expect(fundingFor(usdCash, 1200)).toEqual({ moneda: 'USD', monto_cuenta: 20 });
    // Efectivo en la moneda base: guarda la moneda pero no necesita conversión.
    expect(fundingFor(cash, 1200)).toEqual({ moneda: 'DOP' });
    expect(fundingFor(bank, 1200)).toEqual({});
  });

  it('con base en dólares, una cuenta en pesos se convierte hacia pesos', () => {
    setCurrencyState('USD', { USD: 60, EUR: 65 });
    expect(amountInAccount(bank, 10)).toBe(600);
    expect(fundingFor(cash, 10)).toEqual({ moneda: 'DOP', monto_cuenta: 600 });
    expect(fundingFor(usdCash, 10)).toEqual({ moneda: 'USD' });
  });
});

describe('pagos de una deuda en dólares desde una cuenta en pesos', () => {
  it('convierte con las tasas y valida fondos en la moneda de la cuenta', () => {
    setCurrencyState('DOP', { USD: 60, EUR: 65 });
    const rich = { ...bank, saldo: 6500 };
    expect(amountInAccount(rich, 100, 'USD')).toBe(6000);
    expect(fundsErrorBase(rich, 100, 'USD')).toBeNull();
    expect(fundsErrorBase(rich, 108, 'USD')).toBeNull();
    expect(fundsErrorBase(rich, 100, 'USD', 6600)).toContain('No tienes fondos suficientes');
  });

  it('guarda lo que el banco cobró de verdad cuando se escribe', () => {
    setCurrencyState('DOP', { USD: 60, EUR: 65 });
    expect(fundingFor(bank, 100, 'USD')).toEqual({ monto_cuenta: 6000 });
    expect(fundingFor(bank, 100, 'USD', 6150)).toEqual({ monto_cuenta: 6150 });
    // Misma moneda que la deuda: no hay conversión.
    expect(fundingFor(usdBank, 100, 'USD')).toEqual({});
    expect(fundingFor(cash, 100, 'USD')).toEqual({ moneda: 'DOP', monto_cuenta: 6000 });
  });
});

describe('origen del ingreso', () => {
  it('incluye nómina y servicio prestado', () => {
    const keys = INCOME_SOURCES.map((s) => s.key);
    expect(keys).toEqual(expect.arrayContaining(['nomina', 'servicio']));
    expect(incomeSourceLabel('nomina')).toBe('Nómina');
    expect(incomeSourceLabel('servicio')).toBe('Servicio prestado');
    expect(incomeSourceLabel(null)).toBeNull();
    expect(incomeSourceLabel('desconocido')).toBe('desconocido');
  });
});
