import { expect, test } from '@playwright/test';
import { iso, mockBackend } from './mockBackend';

const USER = 'http://localhost:4173';

const bank = (id: string, banco: string, ultimos4: string) => ({
  id, household_id: 'h1', banco, ultimos4, numero_cuenta: null, saldo_inicial: 20000, alias: null, status: 'activa', provider: 'manual', moneda: 'DOP', created_at: new Date().toISOString(),
});

const tx = (id: string, kind: 'gasto' | 'ingreso', monto: number, descripcion: string, offset = 0) => ({
  id, household_id: 'h1', member_id: 'm1', kind, monto, moneda: 'DOP', monto_cuenta: null, descripcion, occurred_on: iso(offset),
  medio: 'efectivo', category_id: null, subcategoria: null, naturaleza: null, esencial: null, fuente: null, frecuencia: null,
  bank_account_id: null, budget_id: null, income_source: kind === 'ingreso' ? 'nomina' : null, origin_scheduled_expense_id: null,
  receipt_path: null, voice_path: null, created_at: new Date().toISOString(),
});

test.use({ viewport: { width: 390, height: 900 } });

test.describe('Módulos con sesión (datos de ejemplo)', () => {
  test('presupuesto nuevo: toda cuenta asignada, sin opción de dejarla sin especificar', async ({ page }) => {
    await mockBackend(page, { bank_accounts: [bank('a1', 'Banco Popular', '1234')] });
    await page.goto(USER);
    await page.getByLabel('Presupuesto').first().click({ timeout: 40_000 });
    await page.getByText('Crear presupuesto', { exact: true }).first().click();
    await expect(page.getByText('¿De dónde sale este dinero?')).toBeVisible();

    // Al elegir Tarjeta/Transferencia aparecen las cuentas y ya no existe "Sin especificar"
    await page.getByText('Banco', { exact: true }).click();
    await expect(page.getByText('Banco Popular ···1234')).toBeVisible();
    await expect(page.getByText('Sin especificar')).toHaveCount(0);
  });

  test('el Rey Salomón ofrece el resumen del día', async ({ page }) => {
    await mockBackend(page, { transactions: [tx('t1', 'ingreso', 80000, 'Nómina', 0), tx('t2', 'gasto', 1200, 'Supermercado', 0)] });
    await page.goto(USER);
    await page.getByLabel('Rey Salomón').first().click({ timeout: 40_000 });
    await page.getByText('Resumen de mi día', { exact: true }).click();
    await expect(page.getByText(/Movimientos de hoy: 2/).last()).toBeVisible();
  });
});
