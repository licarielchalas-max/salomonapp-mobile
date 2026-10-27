import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const USER = 'http://localhost:4173';
const ADMIN = 'http://localhost:4174';
const axeSource = fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');

// Errores que no dependen de nosotros y no indican un fallo de la app
const IGNORED = [/favicon/i, /Download the React DevTools/i];

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !IGNORED.some((r) => r.test(m.text()))) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

async function seriousViolations(page: Page) {
  await page.evaluate(axeSource);
  const result = await page.evaluate(async () => {
    // @ts-expect-error axe lo inyectamos arriba
    const r = await window.axe.run(document, { resultTypes: ['violations'] });
    return r.violations.map((v: any) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
  });
  // "region" (contenido fuera de landmarks) es una sugerencia menor en apps React Native Web
  return result.filter((v: any) => (v.impact === 'serious' || v.impact === 'critical') && v.id !== 'region');
}

test.describe('App de usuarios', () => {
  test('la bienvenida carga sin errores y es accesible', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(USER);
    await expect(page.getByText('Comenzar')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Ya tengo cuenta')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('sin desbordes horizontales en celular', async ({ page }) => {
    await page.goto(USER);
    await expect(page.getByText('Comenzar')).toBeVisible({ timeout: 30_000 });
    // Si algo se sale del ancho de la pantalla, la página se puede arrastrar de lado
    const scrolledX = await page.evaluate(() => {
      window.scrollTo(300, 0);
      return { x: window.scrollX, wider: document.documentElement.scrollWidth > window.innerWidth };
    });
    expect(scrolledX).toEqual({ x: 0, wider: false });
  });

  test('el login valida campos vacíos sin llamar al servidor', async ({ page }) => {
    await page.goto(USER);
    await page.getByText('Ya tengo cuenta').click();
    await expect(page.getByPlaceholder(/correo|email/i).first()).toBeVisible({ timeout: 15_000 });
    await page.getByText('Iniciar Sesión').click();
    await expect(page.getByText('Por favor completa todos los campos.')).toBeVisible();
  });

  test('recuperar contraseña: el enlace abre el formulario y pide el correo', async ({ page }) => {
    await page.goto(USER);
    await page.getByText('Ya tengo cuenta').click();
    await page.getByText('¿Olvidaste tu contraseña?').click();
    await expect(page.getByText('Enviar enlace')).toBeVisible({ timeout: 15_000 });
    await page.getByText('Enviar enlace').click();
    await expect(page.getByText('Escribe tu correo.')).toBeVisible();
    await page.getByText('Volver a iniciar sesión').click();
    await expect(page.getByText('Iniciar Sesión')).toBeVisible();
  });

  test('se puede instalar como app: manifiesto e íconos', async ({ page, request }) => {
    await page.goto(USER);
    expect(await page.locator('link[rel="manifest"]').getAttribute('href')).toBe('/manifest.json');
    const m = await (await request.get(`${USER}/manifest.json`)).json();
    expect(m.display).toBe('standalone');
    expect(m.name).toContain('Salomón');
    for (const icon of m.icons) {
      const r = await request.get(`${USER}${icon.src}`);
      expect(r.status(), icon.src).toBe(200);
    }
  });

  test('el paquete de usuarios no expone el panel de administración', async ({ page }) => {
    await page.goto(USER);
    await expect(page.getByText('Comenzar')).toBeVisible({ timeout: 30_000 });
    expect(await page.getByText('Panel de Administrador').count()).toBe(0);
  });
});

test.describe('App de administración', () => {
  test('muestra solo el acceso del equipo, sin registro', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(ADMIN);
    await expect(page.getByText('Salomón · Administración')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Entrar')).toBeVisible();
    expect(await page.getByText(/Crear cuenta|Regístrate|Registro/i).count()).toBe(0);
    expect(await seriousViolations(page)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('se instala con su propio nombre', async ({ request }) => {
    const m = await (await request.get(`${ADMIN}/manifest.json`)).json();
    expect(m.name).toBe('Salomón Admin');
  });

  test('pide correo y contraseña antes de llamar al servidor', async ({ page }) => {
    await page.goto(ADMIN);
    await page.getByText('Entrar').click();
    await expect(page.getByText('Escribe tu correo y contraseña.')).toBeVisible();
  });

  test('no se indexa en buscadores', async ({ page, request }) => {
    await page.goto(ADMIN);
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('noindex');
    const txt = await request.get(`${ADMIN}/robots.txt`);
    expect(await txt.text()).toContain('Disallow: /');
  });
});
