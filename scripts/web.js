#!/usr/bin/env node
// Compila o sirve la versión web de usuarios o la de administración (mismo código, dos paquetes).
//   node scripts/web.js build user    → dist/
//   node scripts/web.js build admin   → dist-admin/   (sin indexar en buscadores)
//   node scripts/web.js dev user      → http://localhost:19006
//   node scripts/web.js dev admin     → http://localhost:19007
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const [action, mode] = process.argv.slice(2);
if (!['build', 'dev'].includes(action) || !['user', 'admin'].includes(mode)) {
  console.error('Uso: node scripts/web.js <build|dev> <user|admin>');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const env = { ...process.env, EXPO_PUBLIC_APP_MODE: mode };
const run = (args) =>
  spawnSync('npx', ['expo', ...args], { cwd: root, env, stdio: 'inherit', shell: process.platform === 'win32' }).status ?? 1;

if (action === 'dev') {
  process.exit(run(['start', '--web', '--port', mode === 'admin' ? '19007' : '19006', '--clear']));
}

const out = mode === 'admin' ? 'dist-admin' : 'dist';
const code = run(['export', '--platform', 'web', '--output-dir', out, '--clear']);
if (code !== 0) process.exit(code);

if (mode === 'admin') {
  const dir = path.join(root, out);
  const index = path.join(dir, 'index.html');
  const html = fs.readFileSync(index, 'utf8');
  if (!html.includes('name="robots"')) {
    fs.writeFileSync(index, html.replace('<head>', '<head><meta name="robots" content="noindex,nofollow">'));
  }
  fs.writeFileSync(path.join(dir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  // La app de administración se instala con su propio nombre
  const mf = path.join(dir, 'manifest.json');
  if (fs.existsSync(mf)) {
    const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
    m.name = 'Salomón Admin';
    m.short_name = 'Salomón Admin';
    m.description = 'Panel de administración de Salomón.';
    fs.writeFileSync(mf, JSON.stringify(m, null, 2));
  }
}
console.log(`\nListo: ${out}/ (${mode})`);
