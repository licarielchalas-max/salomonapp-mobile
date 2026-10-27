import { defineConfig } from '@playwright/test';

// Pruebas de extremo a extremo sobre los paquetes ya compilados (npm run build:web / build:admin).
// Ejecutar: npm run test:e2e
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  reporter: [['list']],
  use: { browserName: 'chromium', viewport: { width: 390, height: 844 } },
  webServer: [
    { command: 'node scripts/serve-dist.js dist 4173', port: 4173, reuseExistingServer: true },
    { command: 'node scripts/serve-dist.js dist-admin 4174', port: 4174, reuseExistingServer: true },
  ],
});
