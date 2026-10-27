import { LOCAL_CHIPS, type AdvisorData } from '../localAdvisor';

const base: AdvisorData = {
  ingresos: 30000,
  gastos: 12000,
  balance: 18000,
  deuda: 0,
  cuotaMensual: 0,
  score: 713,
  scoreLabel: 'Bueno',
  pillars: [
    { label: 'Ahorro', score: 80, tip: 'Sigue así.' },
    { label: 'Deuda', score: 20, tip: 'Reduce tus cuotas.' },
  ],
  topGastos: [
    { descripcion: 'Supermercado', monto: 5000 },
    { descripcion: null, monto: 3000 },
  ],
};

const chip = (name: string, data: Partial<AdvisorData> = {}) => LOCAL_CHIPS[name]({ ...base, ...data });

describe('respuestas locales del Rey Salomón', () => {
  it('hay una respuesta para cada botón rápido y ninguna está vacía', () => {
    const names = Object.keys(LOCAL_CHIPS);
    expect(names).toHaveLength(6);
    for (const n of names) expect(chip(n).length).toBeGreaterThan(10);
  });

  it('score: señala el pilar más débil', () => {
    const r = chip('¿Cómo mejorar mi score?');
    expect(r).toContain('713');
    expect(r).toContain('Deuda');
    expect(r).toContain('Reduce tus cuotas.');
  });

  it('gastos: lista los mayores y usa "Sin descripción" cuando falta', () => {
    const r = chip('¿En qué estoy gastando más?');
    expect(r).toContain('Supermercado: RD$5,000');
    expect(r).toContain('Sin descripción');
    expect(r).toContain('40%');
  });

  it('gastos: sin movimientos invita a registrar el primero', () => {
    expect(chip('¿En qué estoy gastando más?', { topGastos: [] })).toContain('Aún no has registrado gastos');
  });

  it('ahorro: con buen ritmo recomienda fondo de emergencia', () => {
    expect(chip('Dame un consejo de ahorro')).toContain('fondo de emergencia');
  });

  it('ahorro: sin ingresos pide registrarlos', () => {
    expect(chip('Dame un consejo de ahorro', { ingresos: 0, balance: 0 })).toContain('Registra tus ingresos');
  });

  it('ahorro: con poco margen sugiere separar el 10%', () => {
    const r = chip('Dame un consejo de ahorro', { ingresos: 10000, gastos: 9800, balance: 200 });
    expect(r).toContain('RD$1,000');
  });

  it('deudas: sin deudas lo celebra; con deudas explica el método avalancha', () => {
    expect(chip('¿Cómo pagar mis deudas más rápido?')).toContain('No tienes deudas');
    const r = chip('¿Cómo pagar mis deudas más rápido?', { deuda: 50000, cuotaMensual: 3000 });
    expect(r).toContain('RD$50,000');
    expect(r).toContain('avalancha');
    expect(r).toContain('10%');
  });

  it('presupuesto: clasifica según el porcentaje usado', () => {
    expect(chip('Revisa mi presupuesto', { gastos: 9000, ingresos: 30000 })).toContain('excelente control');
    expect(chip('Revisa mi presupuesto', { gastos: 33000, ingresos: 30000, balance: -3000 })).toContain('en déficit');
    expect(chip('Revisa mi presupuesto', { ingresos: 0 })).toContain('Aún no hay ingresos');
  });

  it('versículo: devuelve una cita de Proverbios', () => {
    expect(chip('Versículo financiero del día')).toMatch(/Proverbios \d+:\d+/);
  });
});
