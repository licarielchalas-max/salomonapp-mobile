#!/usr/bin/env node
// Toma capturas de una página por secciones, para revisarla sin abrirla a mano.
//   node scripts/shots.js http://localhost:4176 <carpeta-de-salida> [ancho]
const { chromium } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const [url, out, width = '1280'] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: Number(width), height: 900 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  const sections = await page.$$('header.top, section, footer');
  let i = 0;
  for (const s of sections) {
    i++;
    await s.screenshot({ path: path.join(out, `s${String(i).padStart(2, '0')}.png`) });
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log(`${i} secciones. Desborde horizontal: ${overflow}`);
  await browser.close();
})();
