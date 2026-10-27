import { amortizationSchedule } from '../amortization';

describe('amortizationSchedule', () => {
  it('sin interés: saldo / cuota, última cuota ajustada', () => {
    const s = amortizationSchedule(1000, 400, 0);
    expect(s.rows.map((r) => r.cuota)).toEqual([400, 400, 200]);
    expect(s.rows[2].saldo).toBe(0);
    expect(s.totalInteres).toBe(0);
    expect(s.totalPagado).toBe(1000);
  });

  it('con interés: cada fila reparte cuota = interés + capital y el saldo baja a cero', () => {
    const s = amortizationSchedule(100000, 10000, 12);
    expect(s.viable).toBe(true);
    expect(s.rows[0].interes).toBe(1000);
    expect(s.rows[0].capital).toBe(9000);
    expect(s.rows[0].saldo).toBe(91000);
    for (const r of s.rows) expect(Math.round((r.interes + r.capital - r.cuota) * 100)).toBe(0);
    expect(s.rows[s.rows.length - 1].saldo).toBe(0);
    expect(s.rows.length).toBe(11);
    expect(s.totalPagado).toBeCloseTo(100000 + s.totalInteres, 2);
  });

  it('cuota que no cubre el interés no es viable', () => {
    const s = amortizationSchedule(100000, 500, 12);
    expect(s.viable).toBe(false);
    expect(s.rows).toEqual([]);
  });

  it('sin saldo o sin cuota', () => {
    expect(amortizationSchedule(0, 100, 10).rows).toEqual([]);
    expect(amortizationSchedule(500, 0, 10).viable).toBe(false);
  });

  it('fechas mensuales ajustadas al largo del mes', () => {
    const s = amortizationSchedule(300, 100, 0, '2026-01-31');
    expect(s.rows.map((r) => r.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });
});

import { extraCapacity, loanProgress, type LoanPayment } from '../amortization';

const pay = (day: string, total: number, saldoAnt: number, rate: number): LoanPayment => {
  const interes = Math.round(saldoAnt * rate * 100) / 100;
  const capital = Math.round((total - interes) * 100) / 100;
  return { occurred_on: day, monto_total: total, interes, capital, saldo_anterior: saldoAnt, saldo_nuevo: Math.round((saldoAnt - capital) * 100) / 100 };
};

describe('loanProgress', () => {
  const r = 0.01; // 12% anual

  it('sin pagos: igual al plan original, sin ahorro', () => {
    const p = loanProgress({ saldo: 100000, cuota: 10000, tasaAnual: 12 }, []);
    expect(p.paid).toEqual([]);
    expect(p.interestSaved).toBe(0);
    expect(p.monthsSaved).toBe(0);
  });

  it('pagar solo la cuota no ahorra nada', () => {
    const p1 = pay('2026-10-01', 10000, 100000, r);
    const p = loanProgress({ saldo: p1.saldo_nuevo, cuota: 10000, tasaAnual: 12 }, [p1]);
    expect(p.paid).toHaveLength(1);
    expect(p.paid[0].extra).toBe(0);
    expect(Math.abs(p.interestSaved)).toBeLessThan(0.5);
    expect(p.monthsSaved).toBe(0);
  });

  it('pagar extra ahorra intereses y cuotas, y numera lo que falta a continuación', () => {
    const p1 = pay('2026-10-01', 10000, 100000, r);
    const p2 = pay('2026-11-01', 12000, p1.saldo_nuevo, r);
    const p = loanProgress({ saldo: p2.saldo_nuevo, cuota: 10000, tasaAnual: 12 }, [p2, p1]);
    expect(p.paid.map((x) => x.n)).toEqual([1, 2]);
    expect(p.paid[1].extra).toBe(2000);
    expect(p.extraPaid).toBe(2000);
    expect(p.interestSaved).toBeGreaterThan(0);
    expect(p.monthsSaved).toBeGreaterThanOrEqual(0);
    expect(p.remaining.rows[0].n).toBe(3);
  });

  it('simular un extra mensual reduce las cuotas restantes', () => {
    const base = loanProgress({ saldo: 100000, cuota: 10000, tasaAnual: 12 }, []);
    const sim = loanProgress({ saldo: 100000, cuota: 10000, tasaAnual: 12 }, [], { extraMonthly: 5000 });
    expect(sim.remaining.rows.length).toBeLessThan(base.remaining.rows.length);
    expect(sim.interestSaved).toBeGreaterThan(0);
    expect(sim.monthsSaved).toBeGreaterThan(0);
  });

  it('pagar menos que la cuota sale negativo', () => {
    const p1 = pay('2026-10-01', 8000, 100000, r);
    const p = loanProgress({ saldo: p1.saldo_nuevo, cuota: 10000, tasaAnual: 12 }, [p1]);
    expect(p.interestSaved).toBeLessThan(0);
  });
});

describe('extraCapacity', () => {
  it('sin datos del perfil no sugiere nada', () => {
    expect(extraCapacity({ colchon: null, ahorro: null, gasto: null })).toEqual({ level: 'sin-datos', pct: 0 });
  });
  it('colchón bajo: primero el fondo de emergencia', () => {
    expect(extraCapacity({ colchon: 20, ahorro: 80, gasto: 80 }).level).toBe('primero-colchon');
  });
  it('escala según colchón, ahorro y gasto', () => {
    expect(extraCapacity({ colchon: 50, ahorro: 40, gasto: 60 }).pct).toBe(10);
    expect(extraCapacity({ colchon: 70, ahorro: 60, gasto: 60 }).pct).toBe(25);
    expect(extraCapacity({ colchon: 100, ahorro: 90, gasto: 90 }).pct).toBe(50);
  });
});
