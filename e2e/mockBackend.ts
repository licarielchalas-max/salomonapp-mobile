import type { Page, Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Servidor de Supabase de mentira para probar pantallas con sesión iniciada sin usar cuentas ni datos reales.
// Devuelve datos de ejemplo para las tablas que se pasan y listas vacías para todo lo demás.

function envValue(name: string): string {
  const file = path.join(__dirname, '..', '.env');
  const line = fs.readFileSync(file, 'utf8').split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
  return (line ?? '').slice(name.length + 1).trim();
}

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const fakeJwt = (sub: string) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, role: 'authenticated', exp: 4102444800 })}.firma`;

export const TODAY = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
export const iso = (offsetDays = 0) => {
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export interface MockData {
  [table: string]: object[];
}

export async function mockBackend(page: Page, data: MockData, opts: { admin?: boolean } = {}) {
  const url = envValue('EXPO_PUBLIC_SUPABASE_URL');
  const ref = new URL(url).hostname.split('.')[0];
  const userId = '11111111-1111-1111-1111-111111111111';
  const session = {
    access_token: fakeJwt(userId),
    refresh_token: 'refresh-de-prueba',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'ana@ejemplo.com', app_metadata: {}, user_metadata: { display_name: 'Ana Pérez' }, created_at: new Date().toISOString() },
  };
  await page.addInitScript(
    ([key, value]) => {
      try { window.localStorage.setItem(key, value); } catch {}
    },
    [`sb-${ref}-auth-token`, JSON.stringify(session)],
  );

  const base: MockData = {
    household_members: [{ id: 'm1', household_id: 'h1', user_id: userId, role: 'owner' }],
    households: [{
      id: 'h1', plan: 'premium', monthly_budget_total: 0, wallet_initial_balance: 5000, monthly_salary: 0, onboarding_completed: true,
      moneda_base: 'DOP', tasas: { USD: 60, EUR: 65 }, tasas_confirmadas: true, tasas_auto: true, tasas_actualizadas_at: new Date().toISOString(), tasas_fuente: 'ejemplo', wallet_extra: {},
    }],
    subscriptions: [{ id: 's1', household_id: 'h1', plan: 'premium', status: 'trialing', payment_provider: null, provider_reference: null, current_period_end: new Date(Date.now() + 10 * 86400000).toISOString(), created_at: new Date().toISOString() }],
    app_admins: opts.admin ? [{ user_id: userId }] : [],
    ...data,
  };

  await page.route(`${url}/**`, async (route: Route) => {
    const req = route.request();
    const u = new URL(req.url());
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (u.pathname.startsWith('/auth/v1/')) return json(u.pathname.endsWith('/user') ? session.user : session);
    if (u.pathname.startsWith('/rest/v1/rpc/')) return json(null);
    if (u.pathname.startsWith('/rest/v1/')) {
      if (req.method() !== 'GET' && req.method() !== 'HEAD') return json([], 201);
      const table = u.pathname.replace('/rest/v1/', '');
      const rows = base[table] ?? [];
      const wantsObject = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');
      if (wantsObject) return rows.length ? json(rows[0]) : json({ code: 'PGRST116', message: 'The result contains 0 rows' }, 406);
      return json(rows);
    }
    return route.continue();
  });
}
