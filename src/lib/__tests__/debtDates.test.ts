import {
  cutBefore,
  dateForDay,
  debtAttention,
  debtCalendarItems,
  debtCycle,
  debtReminders,
  lastAndNextDue,
  parseDay,
  type DebtDates,
} from '../debtDates';
import { toISODate } from '../reminders';

const NOW = new Date(2026, 9, 10, 12, 0, 0); // 10 oct 2026

function debt(partial: Partial<DebtDates> = {}): DebtDates {
  return {
    id: 'd1', nombre: 'Visa', tipo: 'tarjeta', cuota_mensual: 3500, saldo: 35000, status: 'pendiente',
    dia_corte: 20, dia_pago: 5, aviso_dias_antes: 3, created_at: '2026-01-01T00:00:00Z', ...partial,
  };
}

describe('días del mes', () => {
  it('ajusta al último día en meses cortos', () => {
    expect(dateForDay(2026, 1, 31)).toBe('2026-02-28');
    expect(dateForDay(2024, 1, 31)).toBe('2024-02-29');
    expect(dateForDay(2026, 9, 5)).toBe('2026-10-05');
  });

  it('encuentra el último y el próximo vencimiento', () => {
    expect(lastAndNextDue(5, NOW)).toEqual({ last: '2026-10-05', next: '2026-11-05' });
    expect(lastAndNextDue(15, NOW)).toEqual({ last: '2026-09-15', next: '2026-10-15' });
    expect(lastAndNextDue(10, NOW)).toEqual({ last: '2026-09-10', next: '2026-10-10' });
  });

  it('ubica el corte anterior a un vencimiento', () => {
    expect(cutBefore(20, '2026-11-05')).toBe('2026-10-20');
    expect(cutBefore(1, '2026-11-05')).toBe('2026-11-01');
  });

  it('valida el día escrito', () => {
    expect([parseDay('5'), parseDay('31'), parseDay('0'), parseDay('32'), parseDay('x'), parseDay('1.5')]).toEqual([5, 31, null, null, null, null]);
  });
});

describe('ciclo de pago', () => {
  it('sin pago registrado el último vencimiento queda vencido', () => {
    const c = debtCycle(debt(), [], NOW)!;
    expect(c.last).toBe('2026-10-05');
    expect(c.lastOverdue).toBe(true);
    expect(c.next).toBe('2026-11-05');
    expect(c.nextCut).toBe('2026-10-20');
  });

  it('un pago después del corte cuenta para ese vencimiento', () => {
    // corte 20 sep → vence 5 oct: pagar el 28 sep cubre el 5 oct
    const c = debtCycle(debt(), [{ debt_id: 'd1', occurred_on: '2026-09-28' }], NOW)!;
    expect(c.lastPaid).toBe(true);
    expect(c.lastOverdue).toBe(false);
    expect(c.nextPaid).toBe(false);
  });

  it('un pago anticipado después del corte cubre el próximo vencimiento', () => {
    const now = new Date(2026, 9, 25, 12);
    const c = debtCycle(debt(), [{ debt_id: 'd1', occurred_on: '2026-10-22' }], now)!;
    expect(c.nextPaid).toBe(true);
  });

  it('préstamo sin corte: un pago de los últimos 25 días cubre el vencimiento', () => {
    const loan = debt({ tipo: 'prestamo', dia_corte: null, dia_pago: 5 });
    expect(debtCycle(loan, [{ debt_id: 'd1', occurred_on: '2026-09-20' }], NOW)!.lastPaid).toBe(true);
    expect(debtCycle(loan, [{ debt_id: 'd1', occurred_on: '2026-08-01' }], NOW)!.lastPaid).toBe(false);
  });

  it('una deuda registrada después del vencimiento no se marca vencida', () => {
    const c = debtCycle(debt({ created_at: '2026-10-08T10:00:00Z' }), [], NOW)!;
    expect(c.lastOverdue).toBe(false);
  });

  it('sin fecha de pago o ya pagada no tiene ciclo', () => {
    expect(debtCycle(debt({ dia_pago: null }), [], NOW)).toBeNull();
    expect(debtCycle(debt({ status: 'pagada' }), [], NOW)).toBeNull();
    expect(debtCycle(debt({ saldo: 0 }), [], NOW)).toBeNull();
  });
});

describe('avisos y pendientes', () => {
  it('programa el aviso previo y el del día, y recuerda lo vencido', () => {
    const plan = debtReminders([debt({ id: 'd1' })], [{ debt_id: 'd1', occurred_on: '2026-09-28' }], NOW);
    const keys = plan.map((p) => p.key);
    expect(keys).toContain('deuda:d1:2026-11-05:antes');
    expect(keys).toContain('deuda:d1:2026-11-05:hoy');
    expect(plan.find((p) => p.key.endsWith(':antes'))!.at.getDate()).toBe(2); // 3 días antes del 5 nov
    expect(keys.some((k) => k.includes('vencida'))).toBe(false);

    const overdue = debtReminders([debt()], [], NOW).map((p) => p.key);
    expect(overdue.filter((k) => k.includes('vencida')).length).toBe(2); // hoy a las 9:00 ya pasó
  });

  it('no avisa si ya se pagó el próximo ciclo ni sin aviso configurado', () => {
    const now = new Date(2026, 9, 25, 12);
    const paid = debtReminders([debt()], [{ debt_id: 'd1', occurred_on: '2026-10-22' }], now);
    expect(paid.filter((p) => p.key.includes('2026-11-05'))).toHaveLength(0);
    const noAviso = debtReminders([debt({ aviso_dias_antes: null })], [{ debt_id: 'd1', occurred_on: '2026-09-28' }], NOW);
    expect(noAviso.some((p) => p.key.endsWith(':antes'))).toBe(false);
  });

  it('el pendiente aparece vencido o a 3 días del pago', () => {
    expect(debtAttention([debt()], [], NOW)[0]).toMatchObject({ kind: 'deuda', overdue: true, title: 'Tarjeta: Visa' });
    const soon = new Date(2026, 10, 3, 12);
    const items = debtAttention([debt()], [{ debt_id: 'd1', occurred_on: '2026-10-28' }], soon);
    expect(items).toHaveLength(0); // pagada para el 5 nov
    const unpaid = debtAttention([debt()], [{ debt_id: 'd1', occurred_on: '2026-10-05' }], soon);
    expect(unpaid[0]).toMatchObject({ overdue: false, date: '2026-11-05' });
  });

  it('marca pago y corte en el calendario del mes', () => {
    const items = debtCalendarItems([debt()], [], '2026-10-01', '2026-10-31', NOW);
    expect(items.map((i) => [i.type, i.date])).toEqual(expect.arrayContaining([['pago', '2026-10-05'], ['corte', '2026-10-20']]));
    expect(items.find((i) => i.type === 'pago')!.overdue).toBe(true);
    expect(toISODate(NOW)).toBe('2026-10-10');
  });
});
