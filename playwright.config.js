// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Punta a un eseguibile Chromium locale invece di scaricarlo, utile in ambienti che
        // ne tengono già uno pronto per un'altra versione di Playwright. Non necessario nel
        // caso normale (npx playwright install scarica la versione giusta da solo).
        ...(process.env.PLAYWRIGHT_LOCAL_EXECUTABLE
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_LOCAL_EXECUTABLE } }
          : {}),
      },
    },
  ],
});
