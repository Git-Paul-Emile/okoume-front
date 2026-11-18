import { defineConfig, devices } from '@playwright/test';
import { CONSENT_STATE } from './e2e/support/globalSetup';
import { WEB_URL } from './e2e/support/stack';

/**
 * Tests de parcours sur l'application complète : front, API et worker réels, base de test dédiée
 * (voir e2e/support/stack.ts). Lancement : npm run test:e2e.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/support/globalSetup.ts',
  // Les parcours partagent une base : exécution en série, ordre des fichiers stable
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/.report' }]],
  outputDir: 'e2e/.results',
  use: {
    baseURL: WEB_URL,
    // Cookies non essentiels déjà refusés : le bandeau ne recouvre pas les boutons
    storageState: CONSENT_STATE,
    locale: 'fr-FR',
    timezoneId: 'Africa/Libreville',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
});
