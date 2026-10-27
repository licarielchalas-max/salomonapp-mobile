import { dailyClosingReminders, daySummary, loggingStreak, type DayTx } from '../dailySummary';

const NOW = new Date(2026, 9, 15, 21, 0, 0); // 15 de octubre de 2026, 9 p. m.
const tx = (day: number, kind: 'gasto' | 'ingreso', amount: number): DayTx => ({
  kind,
  amount,
  occurred_on: `2026-10-${String(day).padStart(2, '0')}`,
});

describe('loggingStreak', () => {
  it('cuenta los días seguidos hasta hoy', () => {
    expect(loggingStreak([tx(15, 'gasto', 1), tx(14, 'gasto', 1), tx(13, 'ingreso', 1), tx(11, 'gasto', 1)], NOW)).toBe(3);
  });
  it('si hoy aún no hay movimientos, cuenta desde ayer', () => {
    expect(loggingStreak([tx(14, 'gasto', 1), tx(13, 'gasto', 1)], NOW)).toBe(2);
  });
  it('sin movimientos recientes es 0', () => {
    expect(loggingStreak([tx(2, 'gasto', 1)], NOW)).toBe(0);
  });
});

describe('daySummary', () => {
  it('sin movimientos hoy: invita a registrar', () => {
    const s = daySummary({ now: NOW, transactions: [tx(10, 'gasto', 500)], budgets: [], upcoming: [] });
    expect(s.tone).toBe('nudge');
    expect(s.title).toBe('Cierra tu día');
    expect(s.lines[0]).toContain('Hoy no has registrado movimientos');
  });

  it('día normal y gasto al ritmo del mes: tono bueno con el resumen de hoy', () => {
    const s = daySummary({
      now: NOW,
      transactions: [tx(1, 'ingreso', 100000), tx(14, 'gasto', 20000), tx(15, 'gasto', 1500), tx(15, 'gasto', 500)],
      budgets: [{ nombre: 'Super', monto: 10000, gastado: 3000 }],
      upcoming: [],
    });
    expect(s.tone).toBe('good');
    expect(s.lines[0]).toContain('Movimientos de hoy: 2');
    expect(s.lines[0]).toContain('gastos ¤2,000.00');
    expect(s.lines.some((l) => l.startsWith('Vas bien'))).toBe(true);
    expect(s.lines).toContain('Tus presupuestos van bien.');
    expect(s.streak).toBe(2);
  });

  it('gastando más rápido que el mes: sugiere ajustar', () => {
    const s = daySummary({
      now: NOW,
      transactions: [tx(1, 'ingreso', 50000), tx(15, 'gasto', 40000)],
      budgets: [],
      upcoming: [],
    });
    expect(s.tone).toBe('warn');
    expect(s.lines.some((l) => l.startsWith('Ajuste sugerido'))).toBe(true);
  });

  it('avisa del presupuesto pasado, lo vencido y lo de mañana', () => {
    const s = daySummary({
      now: NOW,
      transactions: [tx(1, 'ingreso', 100000), tx(15, 'gasto', 100)],
      budgets: [{ nombre: 'Comida', monto: 5000, gastado: 6000 }],
      upcoming: [
        { title: 'Luz', date: '2026-10-12', overdue: true, amount: 1200 },
        { title: 'Internet', date: '2026-10-16', amount: 1500 },
      ],
    });
    expect(s.tone).toBe('warn');
    expect(s.lines).toContain('Presupuesto pasado: Comida.');
    expect(s.lines).toContain('Pendiente: Luz (¤1,200.00)');
    expect(s.lines).toContain('Mañana: Internet (¤1,500.00)');
  });
});

describe('dailyClosingReminders', () => {
  it('programa una noche por día, omitiendo la hora que ya pasó', () => {
    const r = dailyClosingReminders(NOW, 3, 20); // son las 9 p. m.: hoy ya pasó
    expect(r.map((x) => x.key)).toEqual(['resumen-2026-10-16', 'resumen-2026-10-17']);
    expect(r[0].at.getHours()).toBe(20);
  });
  it('si aún es de día, incluye hoy', () => {
    const r = dailyClosingReminders(new Date(2026, 9, 15, 9, 0, 0), 2, 20);
    expect(r[0].key).toBe('resumen-2026-10-15');
  });
});
