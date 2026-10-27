#!/usr/bin/env node
// Chequeo de salud del proyecto: detecta problemas de configuración y seguridad antes de que los note un usuario.
//   node scripts/doctor.js          → conexión, correo, seguridad y funciones de PayPal
//   node scripts/doctor.js --db     → además, las reglas de la base de datos (supabase/tests/invariants.sql)
// Sale con código 1 si algo está mal (✗). Los avisos (⚠) no cortan.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const withDb = process.argv.includes('--db');

// Lee .env sin imprimir nada
const env = { ...process.env };
try {
  for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in env)) env[m[1]] = m[2].trim();
  }
} catch {}

const URL_ = env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const PROJECT_REF = URL_ ? new URL(URL_).hostname.split('.')[0] : null;

let failed = 0;
let warned = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const warn = (m, fix) => { warned++; console.log(`  ⚠ ${m}${fix ? `\n      → ${fix}` : ''}`); };
const bad = (m, fix) => { failed++; console.log(`  ✗ ${m}${fix ? `\n      → ${fix}` : ''}`); };
const title = (t) => console.log(`\n${t}`);

async function call(pathname, init = {}) {
  const res = await fetch(URL_ + pathname, { ...init, headers: { apikey: KEY, ...(init.headers || {}) } });
  let body = null;
  try { body = await res.clone().json(); } catch {}
  return { status: res.status, body };
}

async function main() {
  title('Configuración');
  if (!URL_ || !KEY) {
    bad('Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY en mobile/.env', 'Cópialos de .env.example y completa los valores.');
    return;
  }
  ok('Variables de Supabase presentes');

  title('Supabase');
  let health;
  try {
    health = await call('/auth/v1/health');
  } catch (e) {
    bad('No se puede conectar con Supabase.', 'Si es plan gratuito, el proyecto puede estar PAUSADO: entra a supabase.com/dashboard y pulsa "Restore project".');
    return;
  }
  if (health.status === 200) ok('El servicio de autenticación responde');
  else bad(`Autenticación respondió ${health.status}`, 'Revisa el estado del proyecto en el panel de Supabase.');

  const settings = await call('/auth/v1/settings');
  if (settings.status === 200 && settings.body) {
    const s = settings.body;
    if (s.external && s.external.email) ok('Registro con correo habilitado');
    else bad('El registro con correo está deshabilitado');
    if (s.mailer_autoconfirm === false) {
      warn(
        'La confirmación por correo está ACTIVA. Con el correo gratuito de Supabase (pocos envíos por hora y solo a correos del equipo) los usuarios nuevos casi nunca reciben el enlace y no pueden entrar.',
        'Antes de lanzar: conecta un servicio de correo propio (Resend, Brevo…) en Authentication → Emails → SMTP Settings. Para probar ya: desactiva "Confirm email" o crea usuarios con "Add user" y confirmación automática.',
      );
    } else {
      ok('Los registros se confirman automáticamente (modo de pruebas)');
      warn('Registro sin verificar el correo: está bien para pruebas, no para producción.', 'Antes de lanzar, activa "Confirm email" junto con SMTP propio.');
    }
  } else {
    warn('No se pudo leer la configuración de autenticación');
  }

  title('Seguridad (con la clave pública, sin sesión)');
  for (const fn of ['admin_stats', 'admin_payments', 'admin_referrers', 'admin_list_tickets']) {
    const r = await call(`/rest/v1/rpc/${fn}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` }, body: '{}' });
    if (r.status === 200) bad(`${fn} es ejecutable sin iniciar sesión`, 'Revoca el permiso a anon en esa función.');
    else ok(`${fn} bloqueada para visitantes (HTTP ${r.status})`);
  }
  for (const table of ['households', 'debts', 'transactions', 'subscription_payments', 'support_tickets']) {
    const r = await call(`/rest/v1/${table}?select=*&limit=1`, { headers: { Authorization: `Bearer ${KEY}` } });
    if (r.status === 200 && Array.isArray(r.body) && r.body.length > 0) bad(`La tabla ${table} devuelve datos a visitantes`, 'Revisa sus políticas RLS.');
    else ok(`${table}: sin datos para visitantes`);
  }

  title('Pagos con PayPal');
  const hook = await fetch(`${URL_}/functions/v1/paypal-webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"event_type":"DOCTOR.TEST"}' });
  if (hook.status === 400) ok('paypal-webhook activo: autentica con PayPal y exige firma válida');
  else if (hook.status === 404) bad('paypal-webhook no está desplegado', 'supabase functions deploy paypal-webhook --no-verify-jwt');
  else if (hook.status >= 500) bad(`paypal-webhook falla (HTTP ${hook.status}): casi siempre es que PayPal no acepta las credenciales`, 'Revisa PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_ENV en los Secrets (deben ser del mismo ambiente).');
  else warn(`paypal-webhook respondió HTTP ${hook.status} (se esperaba 400)`);
  const sub = await fetch(`${URL_}/functions/v1/paypal-subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY }, body: '{"plan":"personal"}' });
  if (sub.status === 401) ok('paypal-subscribe exige sesión');
  else if (sub.status === 404) bad('paypal-subscribe no está desplegado', 'supabase functions deploy paypal-subscribe');
  else warn(`paypal-subscribe respondió HTTP ${sub.status} sin sesión (se esperaba 401)`);

  if (withDb) {
    title('Reglas de la base de datos');
    const file = path.resolve(root, '..', 'supabase', 'tests', 'invariants.sql');
    const r = spawnSync('supabase', ['db', 'query', '--linked', '--project-ref', PROJECT_REF, '-f', `"${file}"`], { encoding: 'utf8', shell: process.platform === 'win32', cwd: path.resolve(root, '..') });
    const out = (r.stdout || '') + (r.stderr || '');
    const start = out.indexOf('{');
    const end = out.lastIndexOf('}');
    try {
      const json = JSON.parse(out.slice(start, end + 1));
      if (!json.rows.length) ok('Se cumplen todas las reglas (RLS, funciones de admin, search_path, cobros de prueba)');
      else for (const row of json.rows) bad(`${row.problema}: ${row.detalle}`);
    } catch {
      warn('No se pudieron ejecutar las reglas de la base de datos', 'Requiere la CLI de Supabase con sesión iniciada (supabase login) y el proyecto activo.');
    }
  }
}

main()
  .catch((e) => bad(`Error inesperado: ${e.message}`))
  .finally(() => {
    console.log(`\n${failed ? '✗' : '✓'} ${failed} problema(s), ${warned} aviso(s)`);
    process.exit(failed ? 1 : 0);
  });
