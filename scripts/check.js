#!/usr/bin/env node
// Puerta de calidad: si esto pasa, el cambio no rompió lo que ya funcionaba.
//   node scripts/check.js          → tipos (tsc) + pruebas (jest)              (rápido, lo corre el commit)
//   node scripts/check.js --full   → además compila los dos paquetes web y comprueba que siguen separados
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const full = process.argv.includes('--full');
const sh = process.platform === 'win32';

function step(name, cmd, args) {
  process.stdout.write(`\n▶ ${name}\n`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: sh });
  if (r.status !== 0) {
    console.error(`\n✗ Falló: ${name}`);
    process.exit(r.status || 1);
  }
}

step('Tipos (tsc)', 'npx', ['tsc', '--noEmit']);
step('Pruebas (jest)', 'npx', ['jest', '--silent']);

if (full) {
  step('Compilar app de usuarios', 'node', ['scripts/web.js', 'build', 'user']);
  step('Compilar app de admin', 'node', ['scripts/web.js', 'build', 'admin']);

  const bundle = (dir) => {
    const d = path.join(root, dir, '_expo', 'static', 'js', 'web');
    return fs.readdirSync(d).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(d, f), 'utf8')).join('\n');
  };
  const user = bundle('dist');
  const admin = bundle('dist-admin');
  // Cada paquete solo puede contener lo suyo
  const rules = [
    ['la app de usuarios NO debe incluir funciones de admin', !/admin_stats|admin_list_tickets|admin_payments/.test(user)],
    ['la app de admin NO debe incluir el cobro de PayPal', !/paypal-subscribe/.test(admin)],
    ['la app de admin debe incluir el panel', /admin_stats/.test(admin)],
    ['la app de usuarios debe incluir el cobro de PayPal', /paypal-subscribe/.test(user)],
  ];
  process.stdout.write('\n▶ Separación de paquetes\n');
  let bad = 0;
  for (const [msg, pass] of rules) {
    console.log(`  ${pass ? '✓' : '✗'} ${msg}`);
    if (!pass) bad++;
  }
  if (bad) process.exit(1);
}

console.log('\n✓ Todo en orden');
