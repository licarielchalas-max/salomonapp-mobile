import { expect, test } from '@playwright/test';
import { iso, mockBackend } from './mockBackend';

const USER = 'http://localhost:4173';

const tx = (id: string, kind: 'gasto' | 'ingreso', monto: number, descripcion: string, offset = 0) => ({
  id, household_id: 'h1', member_id: 'm1', kind, monto, moneda: 'DOP', monto_cuenta: null, descripcion, occurred_on: iso(offset),
  medio: 'efectivo', category_id: null, subcategoria: null, naturaleza: null, esencial: null, fuente: null, frecuencia: null,
  bank_account_id: null, budget_id: null, income_source: kind === 'ingreso' ? 'nomina' : null, origin_scheduled_expense_id: null,
  receipt_path: null, voice_path: null, created_at: new Date().toISOString(),
});

const budget = (id: string, nombre: string, monto: number) => ({
  id, household_id: 'h1', nombre, monto, category_id: null, medio: 'efectivo', bank_account_id: null, nota: null, created_at: new Date().toISOString(),
});

const move = (id: string, budget_id: string, tipo: 'abono' | 'gasto', monto: number) => ({
  id, household_id: 'h1', budget_id, tipo, monto, nota: null, medio: 'efectivo', bank_account_id: null, transaction_id: null,
  moneda: 'DOP', monto_cuenta: null, occurred_on: iso(0), created_at: new Date().toISOString(),
});

test.describe('Dashboard con sesión (datos de ejemplo)', () => {
  test.use({ viewport: { width: 390, height: 900 } });

  test('muestra los presupuestos creados y el resumen del día', async ({ page }) => {
    await mockBackend(page, {
      transactions: [tx('t1', 'ingreso', 80000, 'Nómina', 0), tx('t2', 'gasto', 1200, 'Supermercado', 0)],
      budgets: [budget('b1', 'Supermercado', 10000), budget('b2', 'Gasolina', 3000)],
      budget_movements: [move('m1', 'b1', 'abono', 10000), move('m2', 'b1', 'gasto', 9000), move('m3', 'b2', 'abono', 3000), move('m4', 'b2', 'gasto', 500)],
    });
    await page.goto(USER);

    // Resumen del día
    await expect(page.getByText('Movimientos de hoy: 2')).toBeVisible({ timeout: 40_000 });

    // El mosaico y la sección de presupuestos muestran lo que se creó
    await expect(page.getByText('Presupuesto · 2')).toBeVisible();
    await expect(page.getByText('Presupuestos del mes')).toBeVisible();
    await expect(page.getByLabel('Presupuesto Supermercado')).toBeVisible();
    await expect(page.getByLabel('Presupuesto Gasolina')).toBeVisible();
    await page.getByText('Movimientos de hoy: 2').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/dashboard-resumen.png' });
    await page.getByText('Presupuestos del mes').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/dashboard-presupuestos.png' });
  });

  test('sin presupuestos invita a crear el primero', async ({ page }) => {
    await mockBackend(page, { transactions: [tx('t1', 'ingreso', 80000, 'Nómina', -3)] });
    await page.goto(USER);
    await expect(page.getByText('Aún no tienes presupuestos')).toBeVisible({ timeout: 40_000 });
    await expect(page.getByText('Crea tu primer presupuesto').first()).toBeVisible();
    // Hoy no hay movimientos: el resumen invita a registrar
    await expect(page.getByText('Registrar un gasto')).toBeVisible();
  });
});
