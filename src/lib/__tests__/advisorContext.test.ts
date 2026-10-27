import { buildAdvisorContext, recentHistory, type AdvisorContextInput } from '../advisorContext';

const base: AdvisorContextInput = {
  now: new Date(2026, 9, 15, 20, 0, 0),
  symbol: 'RD$',
  currencyName: 'Peso dominicano',
  monthLabel: 'octubre de 2026',
  ingresos: 80000,
  gastos: 31200,
  balance: 48800,
  transactions: [
    { kind: 'ingreso', amount: 80000, occurred_on: '2026-10-01', descripcion: 'Nómina' },
    { kind: 'gasto', amount: 1200, occurred_on: '2026-10-15', descripcion: 'Supermercado' },
    { kind: 'gasto', amount: 30000, occurred_on: '2026-10-05', descripcion: 'Alquiler' },
  ],
  accounts: [{ nombre: 'Banco Popular', saldo: 'RD$ 12,000.00' }],
  budgets: [{ nombre: 'Comida', monto: 10000, gastado: 9000, disponible: 1000, cuenta: 'Banco Popular' }],
  debts: [{ nombre: 'Carro', tipo: 'prestamo', saldo: 183565, cuota: 10000, tasaAnual: 17, diaPago: 20, moneda: 'DOP' }],
  upcoming: [{ title: 'Luz', date: '2026-10-12', overdue: true, amount: 1200 }],
  goals: [{ nombre: 'Fondo de emergencia', actual: 5000, meta: 50000 }],
  score: { total: 650, label: 'Regular', weakest: { label: 'Colchón', score: 20 } },
};

describe('buildAdvisorContext', () => {
  const text = buildAdvisorContext(base);

  it('incluye mes, hoy y mayores gastos', () => {
    expect(text).toContain('FECHA: 2026-10-15');
    expect(text).toContain('gastado 39% de los ingresos');
    expect(text).toContain('HOY: 1 movimientos');
    expect(text).toContain('Alquiler RD$30,000.00; Supermercado RD$1,200.00');
  });

  it('incluye cuentas, presupuestos (con su cuenta y alerta), deudas y pagos', () => {
    expect(text).toContain('Banco Popular RD$ 12,000.00');
    expect(text).toContain('Comida (sale de Banco Popular): gastado RD$9,000.00 de RD$10,000.00, disponible RD$1,000.00 [cerca del límite]');
    expect(text).toContain('Carro (prestamo, DOP): saldo 183565, cuota 10000/mes, tasa 17% anual, paga el día 20');
    expect(text).toContain('Luz el 2026-10-12 [VENCIDO] (RD$1,200.00)');
  });

  it('incluye metas y el punto débil del score', () => {
    expect(text).toContain('Fondo de emergencia RD$5,000.00 de RD$50,000.00');
    expect(text).toContain('punto más débil: Colchón (20/100)');
  });

  it('dice claramente cuando no hay datos', () => {
    const t = buildAdvisorContext({ ...base, accounts: [], budgets: [], debts: [], upcoming: [], goals: [] });
    expect(t).toContain('CUENTAS: ninguna registrada.');
    expect(t).toContain('PRESUPUESTOS: ninguno creado.');
    expect(t).toContain('DEUDAS: ninguna registrada.');
  });

  it('marca el presupuesto pasado', () => {
    const t = buildAdvisorContext({ ...base, budgets: [{ nombre: 'Gasolina', monto: 3000, gastado: 3500, disponible: -500, cuenta: 'Efectivo' }] });
    expect(t).toContain('[PASADO]');
  });
});

describe('recentHistory', () => {
  it('conserva los últimos turnos y recorta lo muy largo', () => {
    const msgs = Array.from({ length: 12 }, (_, i) => ({ role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', content: `m${i}`.repeat(300) }));
    const h = recentHistory(msgs, 8);
    expect(h).toHaveLength(8);
    expect(h[0].content.length).toBe(600);
    expect(h[7].content.startsWith('m11')).toBe(true);
  });
});
