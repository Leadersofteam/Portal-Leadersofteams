import { existsSync } from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

// E2E ścieżki krytycznej (ADR-008, D5). Zakłada DZIAŁAJĄCY stack (web+api+worker+
// MySQL+Redis) pod E2E_BASE_URL — uruchamiany skryptem `infra/e2e.sh`.
// Przeglądarka: reużywamy Chromium z cache Playwright (rewizja może różnić się od
// tej, której oczekuje pakiet — dlatego executablePath, jeśli podano/istnieje).
const CACHED_CHROMIUM =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  '/root/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome';
const executablePath = existsSync(CACHED_CHROMIUM) ? CACHED_CHROMIUM : undefined;

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath, args: ['--no-sandbox'] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
