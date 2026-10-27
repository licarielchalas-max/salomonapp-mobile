import { computeAccess, isUnlimited, planInfo, PLANS, profilesCap, profilesLabel, TRIAL_DAYS, UNLIMITED } from '../plans';

const NOW = new Date('2026-10-05T12:00:00Z').getTime();
const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(NOW + offsetDays * DAY).toISOString();

describe('computeAccess', () => {
  it('prueba vigente: tiene acceso y cuenta los días que faltan', () => {
    const a = computeAccess({ status: 'trialing', current_period_end: iso(12) }, false, NOW);
    expect(a).toMatchObject({ hasAccess: true, isTrial: true, isPaid: false, expired: false, daysLeft: 12 });
  });

  it('el último día cuenta como 1 día restante', () => {
    const a = computeAccess({ status: 'trialing', current_period_end: new Date(NOW + 3 * 3600_000).toISOString() }, false, NOW);
    expect(a.daysLeft).toBe(1);
    expect(a.hasAccess).toBe(true);
  });

  it('prueba vencida: sin acceso y daysLeft en 0', () => {
    const a = computeAccess({ status: 'trialing', current_period_end: iso(-1) }, false, NOW);
    expect(a).toMatchObject({ hasAccess: false, isTrial: false, expired: true, daysLeft: 0 });
  });

  it('prueba sin fecha de fin: se trata como vencida (nunca abre acceso por error)', () => {
    const a = computeAccess({ status: 'trialing', current_period_end: null }, false, NOW);
    expect(a.hasAccess).toBe(false);
  });

  it('suscripción activa: acceso y pagada', () => {
    const a = computeAccess({ status: 'active', current_period_end: iso(20) }, false, NOW);
    expect(a).toMatchObject({ hasAccess: true, isPaid: true, isTrial: false });
  });

  it('cancelada con periodo ya pagado: conserva acceso hasta el fin', () => {
    expect(computeAccess({ status: 'canceled', current_period_end: iso(5) }, false, NOW).hasAccess).toBe(true);
    expect(computeAccess({ status: 'canceled', current_period_end: iso(-5) }, false, NOW).hasAccess).toBe(false);
  });

  it('pago atrasado sin periodo vigente: sin acceso', () => {
    expect(computeAccess({ status: 'past_due', current_period_end: iso(-1) }, false, NOW).hasAccess).toBe(false);
  });

  it('sin suscripción: sin acceso', () => {
    expect(computeAccess(null, false, NOW)).toMatchObject({ hasAccess: false, expired: true, daysLeft: null });
  });

  it('administrador: siempre tiene acceso, aunque la prueba haya vencido', () => {
    expect(computeAccess({ status: 'trialing', current_period_end: iso(-30) }, true, NOW).hasAccess).toBe(true);
    expect(computeAccess(null, true, NOW).hasAccess).toBe(true);
  });
});

describe('planes', () => {
  it('los tres planes cubren el enum de la base de datos con los límites de perfiles (Legado sin límite)', () => {
    expect(PLANS.map((p) => [p.id, p.profiles, p.priceUsd])).toEqual([
      ['personal', 1, 5],
      ['premium', 2, 10],
      ['familiar', UNLIMITED, 15],
    ]);
  });

  it('planInfo devuelve el plan pedido', () => {
    expect(planInfo('premium').name).toBe('Salomón Alianza');
    expect(isUnlimited(planInfo('familiar').profiles)).toBe(true);
    expect(profilesLabel(planInfo('familiar').profiles)).toBe('Perfiles ilimitados');
    expect(profilesCap(planInfo('familiar').profiles)).toBe('∞');
    expect(profilesLabel(1)).toBe('1 perfil');
    expect(profilesLabel(2)).toBe('2 perfiles');
  });

  it('la prueba dura lo que promete la pantalla de registro', () => {
    expect(TRIAL_DAYS).toBe(15);
  });
});
