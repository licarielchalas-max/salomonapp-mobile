import {
  addDays,
  attentionItems,
  buildReminderPlan,
  daysFromToday,
  dueLabel,
  eventReminderDate,
  isValidTime,
  nextOccurrence,
  occurrencesInRange,
  normalizeTime,
  paymentReminderDate,
  toISODate,
} from '../reminders';
import type { CalendarEventRow, ScheduledExpenseRow } from '../../types/db';

const NOW = new Date(2026, 9, 9, 10, 0, 0); // 9 oct 2026, 10:00

function ev(partial: Partial<CalendarEventRow>): CalendarEventRow {
  return {
    id: 'e1', household_id: 'h', titulo: 'Dentista', event_date: '2026-10-12', event_time: '15:00:00',
    tipo: 'cita', notas: null, lugar: null, aviso_minutos: 60, recurrencia: 'ninguna', completado: false,
    created_at: '2026-10-01T00:00:00Z', ...partial,
  };
}

function exp(partial: Partial<ScheduledExpenseRow>): ScheduledExpenseRow {
  return {
    id: 'p1', household_id: 'h', descripcion: 'Luz', category_id: null, monto: 1200, fecha_pago: '2026-10-15',
    fecha_recordatorio: null, metodo_pago: 'efectivo', bank_account_id: null, status: 'pendiente',
    aviso_dias_antes: 2, hora_aviso: '09:00:00', recurrencia: 'ninguna', pospuesto_veces: 0,
    created_at: '2026-10-01T00:00:00Z', ...partial,
  };
}

describe('fechas', () => {
  it('suma días y calcula la próxima fecha recurrente', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(nextOccurrence('2026-10-15', 'semanal')).toBe('2026-10-22');
    expect(nextOccurrence('2026-10-15', 'mensual')).toBe('2026-11-15');
    expect(nextOccurrence('2026-01-31', 'mensual')).toBe('2026-02-28');
    expect(nextOccurrence('2024-01-31', 'mensual')).toBe('2024-02-29');
    expect(nextOccurrence('2026-12-31', 'mensual')).toBe('2027-01-31');
    expect(nextOccurrence('2026-10-15', 'anual')).toBe('2027-10-15');
    expect(nextOccurrence('2026-10-15', 'ninguna')).toBe('2026-10-15');
  });

  it('cuenta días desde hoy y describe el vencimiento', () => {
    expect(daysFromToday('2026-10-09', NOW)).toBe(0);
    expect(daysFromToday('2026-10-12', NOW)).toBe(3);
    expect(dueLabel('2026-10-09', NOW)).toBe('Hoy');
    expect(dueLabel('2026-10-10', NOW)).toBe('Mañana');
    expect(dueLabel('2026-10-12', NOW)).toBe('En 3 días');
    expect(dueLabel('2026-10-08', NOW)).toBe('Vencido ayer');
    expect(dueLabel('2026-10-05', NOW)).toBe('Vencido hace 4 días');
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('valida la hora en formato 24 h', () => {
    expect(isValidTime('15:30')).toBe(true);
    expect(isValidTime('9:05')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('12:60')).toBe(false);
    expect(isValidTime('abc')).toBe(false);
    expect(normalizeTime('9:05')).toBe('09:05');
  });
});

describe('repeticiones', () => {
  it('lista las fechas de un evento dentro de un rango', () => {
    expect(occurrencesInRange({ event_date: '2026-10-12', recurrencia: 'ninguna' }, '2026-10-01', '2026-10-31')).toEqual(['2026-10-12']);
    expect(occurrencesInRange({ event_date: '2026-10-12', recurrencia: 'ninguna' }, '2026-11-01', '2026-11-30')).toEqual([]);
    expect(occurrencesInRange({ event_date: '2026-10-05', recurrencia: 'semanal' }, '2026-10-10', '2026-10-31')).toEqual(['2026-10-12', '2026-10-19', '2026-10-26']);
    expect(occurrencesInRange({ event_date: '2026-01-15', recurrencia: 'mensual' }, '2026-10-01', '2026-10-31')).toEqual(['2026-10-15']);
  });
});

describe('cuándo avisar', () => {
  it('evento con hora: resta los minutos de aviso', () => {
    const at = eventReminderDate(ev({ aviso_minutos: 60 }))!;
    expect(at.getHours()).toBe(14);
    expect(at.getMinutes()).toBe(0);
    expect(toISODate(at)).toBe('2026-10-12');
    expect(eventReminderDate(ev({ aviso_minutos: 0 }))!.getHours()).toBe(15);
    expect(eventReminderDate(ev({ aviso_minutos: 1440 }))!.getDate()).toBe(11);
  });

  it('evento de todo el día: avisa a las 9:00 con los días de anticipación', () => {
    const a = eventReminderDate(ev({ event_time: null, aviso_minutos: 0 }))!;
    expect([a.getDate(), a.getHours()]).toEqual([12, 9]);
    const b = eventReminderDate(ev({ event_time: null, aviso_minutos: 2880 }))!;
    expect([b.getDate(), b.getHours()]).toEqual([10, 9]);
  });

  it('sin aviso no hay recordatorio', () => {
    expect(eventReminderDate(ev({ aviso_minutos: null }))).toBeNull();
    expect(paymentReminderDate(exp({ aviso_dias_antes: null }))).toBeNull();
    expect(paymentReminderDate(exp({ status: 'pagado' }))).toBeNull();
  });

  it('pago: avisa los días antes a la hora elegida', () => {
    const at = paymentReminderDate(exp({ aviso_dias_antes: 2, hora_aviso: '08:30:00' }))!;
    expect(toISODate(at)).toBe('2026-10-13');
    expect([at.getHours(), at.getMinutes()]).toEqual([8, 30]);
  });
});

describe('plan de avisos', () => {
  it('solo incluye avisos futuros, ordenados', () => {
    const plan = buildReminderPlan(
      [ev({ id: 'e1', event_date: '2026-10-12' }), ev({ id: 'e2', event_date: '2026-10-09', event_time: '10:30:00', aviso_minutos: 60 })],
      [exp({ id: 'p1', fecha_pago: '2026-10-15' })],
      NOW,
    );
    // e2 avisaría a las 9:30, que ya pasó
    expect(plan.map((p) => p.key.split(':')[1])).toEqual(['e1', 'p1']);
    expect(plan[0].title).toBe('Cita: Dentista');
    expect(plan[0].body).toMatch(/(3:00|15:00)/);
    expect(plan[1].title).toBe('Pago pendiente: Luz');
    expect(plan[1].body).toContain('1,200.00');
  });

  it('expande eventos recurrentes a las próximas apariciones', () => {
    const plan = buildReminderPlan([ev({ recurrencia: 'semanal', event_date: '2026-10-12' })], [], NOW);
    expect(plan.length).toBeGreaterThan(10);
    expect(new Set(plan.map((p) => p.key)).size).toBe(plan.length);
  });

  it('un pago vencido recuerda cada día a la hora elegida', () => {
    const plan = buildReminderPlan([], [exp({ fecha_pago: '2026-10-05', hora_aviso: '09:00:00' })], NOW);
    const days = plan.filter((p) => p.key.startsWith('vencido')).map((p) => toISODate(p.at));
    expect(days).toEqual(['2026-10-10', '2026-10-11']);
    expect(plan[0].title).toBe('Pago vencido: Luz');
  });

  it('respeta el límite y omite pagos sin aviso o ya pagados', () => {
    const many = Array.from({ length: 100 }, (_, i) => exp({ id: `p${i}`, fecha_pago: addDays('2026-10-20', i % 30) }));
    expect(buildReminderPlan([], many, NOW, 60)).toHaveLength(60);
    expect(buildReminderPlan([], [exp({ aviso_dias_antes: null }), exp({ status: 'pagado' })], NOW)).toHaveLength(0);
  });
});

describe('pendientes de hoy', () => {
  it('reúne pagos vencidos o próximos y eventos de hoy', () => {
    const items = attentionItems(
      [ev({ id: 'e1', event_date: '2026-10-09' }), ev({ id: 'e2', event_date: '2026-10-20' })],
      [exp({ id: 'p1', fecha_pago: '2026-10-07' }), exp({ id: 'p2', fecha_pago: '2026-10-11' }), exp({ id: 'p3', fecha_pago: '2026-10-30' })],
      NOW,
    );
    expect(items.map((i) => i.id)).toEqual(['p1', 'e1', 'p2']);
    expect(items[0].overdue).toBe(true);
    expect(items[2].overdue).toBe(false);
  });
});
