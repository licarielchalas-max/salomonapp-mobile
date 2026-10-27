import { computeScore, gradeFor, labelFor, scorePosition, PILLAR_WEIGHTS, type ScoreInput } from '../score';

const NOW = new Date(2026, 9, 10, 12, 0, 0);

function tx(kind: 'gasto' | 'ingreso', monto: number, daysAgo: number) {
  const d = new Date(NOW.getTime() - daysAgo * 86400000);
  const p = (n: number) => String(n).padStart(2, '0');
  return { kind, monto, occurred_on: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` };
}

function base(partial: Partial<ScoreInput> = {}): ScoreInput {
  return { now: NOW, transactions: [], scheduled: [], debts: [], goals: [], liquidTotal: 0, budgets: [], firstActivity: null, ...partial };
}

/** Tres meses de uso: 2 ingresos y 13 gastos por mes. */
function established(overrides: Partial<ScoreInput> = {}): ScoreInput {
  const transactions = [] as ScoreInput['transactions'];
  for (let m = 0; m < 3; m++) {
    transactions.push(tx('ingreso', 30000, m * 30 + 2), tx('ingreso', 30000, m * 30 + 3));
    for (let i = 0; i < 13; i++) transactions.push(tx('gasto', 40000 / 13, m * 30 + 4 + i));
  }
  return base({ transactions, firstActivity: tx('ingreso', 1, 89).occurred_on, liquidTotal: 120000, ...overrides });
}

describe('escala', () => {
  it('asigna la nota por tramos', () => {
    expect([850, 800, 799, 740, 670, 580, 500, 499].map(gradeFor)).toEqual(['A+', 'A+', 'A', 'A', 'B', 'C', 'D', 'F']);
    expect(labelFor('A+')).toBe('Excelente');
    expect(scorePosition(300)).toBe(0);
    expect(scorePosition(850)).toBe(1);
    expect(scorePosition(575)).toBeCloseTo(0.5);
  });

  it('los pesos suman 100', () => {
    expect(Object.values(PILLAR_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('cuentas nuevas', () => {
  it('una cuenta vacía es provisional y nunca excelente', () => {
    const r = computeScore(base());
    expect(r.provisional).toBe(true);
    expect(r.confidence).toBe('baja');
    expect(r.total).toBeGreaterThanOrEqual(500);
    expect(r.total).toBeLessThanOrEqual(650);
    expect(r.grade).not.toBe('A+');
    expect(r.missing.length).toBeGreaterThan(0);
  });

  it('con poco historial se limita a 650 aunque los números sean perfectos', () => {
    const r = computeScore(
      base({ transactions: [tx('ingreso', 50000, 1), tx('gasto', 1000, 0)], firstActivity: tx('ingreso', 1, 1).occurred_on, liquidTotal: 400000 }),
    );
    expect(r.provisional).toBe(true);
    expect(r.total).toBe(650);
  });
});

describe('cuentas con historial', () => {
  it('finanzas sanas llegan a nivel máximo con confianza alta', () => {
    const r = computeScore(
      established({
        scheduled: [{ fecha_pago: tx('gasto', 1, 20).occurred_on, status: 'pagado', paid_on: tx('gasto', 1, 22).occurred_on, pospuesto_veces: 0 }],
      }),
    );
    expect(r.confidence).toBe('alta');
    expect(r.provisional).toBe(false);
    expect(r.total).toBe(850);
    expect(r.grade).toBe('A+');
    expect(r.pillars.find((p) => p.key === 'pagos')?.score).toBe(100);
  });

  it('los pagos vencidos bajan el puntaje', () => {
    const ok = computeScore(established());
    const late = computeScore(
      established({
        scheduled: [
          { fecha_pago: tx('gasto', 1, 10).occurred_on, status: 'pendiente', paid_on: null, pospuesto_veces: 0 },
          { fecha_pago: tx('gasto', 1, 5).occurred_on, status: 'pendiente', paid_on: null, pospuesto_veces: 0 },
        ],
      }),
    );
    expect(late.pillars.find((p) => p.key === 'pagos')?.score).toBe(0);
    expect(late.total).toBeLessThan(ok.total);
    expect(late.pillars.find((p) => p.key === 'pagos')?.tip).toContain('2 pagos vencidos');
  });

  it('pagar tarde cuenta a medias y posponer resta un poco', () => {
    const r = computeScore(
      established({
        scheduled: [
          { fecha_pago: tx('gasto', 1, 20).occurred_on, status: 'pagado', paid_on: tx('gasto', 1, 18).occurred_on, pospuesto_veces: 0 },
          { fecha_pago: tx('gasto', 1, 40).occurred_on, status: 'pagado', paid_on: tx('gasto', 1, 41).occurred_on, pospuesto_veces: 2 },
        ],
      }),
    );
    // (1 a tiempo + 0.5 tardío) / 2 = 75, menos 6 por 2 posposiciones
    expect(r.pillars.find((p) => p.key === 'pagos')?.score).toBe(69);
  });

  it('el consejo de ahorro coincide con lo que falta', () => {
    const r = computeScore(established({ goals: [{ current_amount: 100, target_amount: 1000 }] }));
    const ahorro = r.pillars.find((p) => p.key === 'ahorro')!;
    expect(ahorro.potential).toBeGreaterThan(0);
    expect(ahorro.tip).toContain('metas');
  });

  it('las cuotas altas frente al ingreso hunden el factor de deudas', () => {
    const r = computeScore(established({ debts: [{ cuota_mensual: 30000 }] })); // 50% de 60k
    expect(r.pillars.find((p) => p.key === 'deudas')?.score).toBe(0);
    const bajo = computeScore(established({ debts: [{ cuota_mensual: 6000 }] })); // 10%
    expect(bajo.pillars.find((p) => p.key === 'deudas')?.score).toBe(100);
  });

  it('el colchón mide meses de gastos cubiertos', () => {
    const r = computeScore(established({ liquidTotal: 20000 })); // 0.5 meses de 40k
    expect(r.pillars.find((p) => p.key === 'colchon')?.score).toBe(17);
    expect(r.pillars.find((p) => p.key === 'colchon')?.tip).toContain('0.5 meses');
  });

  it('gastar más de lo que se gana y pasarse de presupuesto penaliza', () => {
    const r = computeScore(
      established({
        transactions: [tx('ingreso', 10000, 30), tx('gasto', 13000, 20), ...Array.from({ length: 30 }, (_, i) => tx('gasto', 10, i))],
        firstActivity: tx('ingreso', 1, 60).occurred_on,
        budgets: [{ monto: 1000, gastado: 2000 }],
      }),
    );
    expect(r.pillars.find((p) => p.key === 'gasto')!.score!).toBeLessThan(30);
  });
});

describe('factores sin datos', () => {
  it('repartiendo su peso entre los demás', () => {
    const r = computeScore(base({ transactions: [tx('gasto', 100, 1)], firstActivity: tx('gasto', 1, 1).occurred_on }));
    const pagos = r.pillars.find((p) => p.key === 'pagos')!;
    expect(pagos.score).toBeNull();
    expect(pagos.effectiveWeight).toBe(0);
    const sum = r.pillars.reduce((s, p) => s + p.effectiveWeight, 0);
    expect(sum).toBeGreaterThanOrEqual(99);
    expect(sum).toBeLessThanOrEqual(101);
  });

  it('el potencial de cada factor suma lo que falta para el máximo', () => {
    const r = computeScore(established({ liquidTotal: 0, debts: [{ cuota_mensual: 15000 }] }));
    const potential = r.pillars.reduce((s, p) => s + p.potential, 0);
    expect(r.total + potential).toBeGreaterThanOrEqual(845);
    expect(r.total + potential).toBeLessThanOrEqual(855);
  });
});
