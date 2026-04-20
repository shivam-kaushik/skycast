import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.E2E_PORT ?? 4173)
const baseURL = `http://localhost:${port}`

const workers = process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : 1

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 180_000,
  fullyParallel: workers > 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    geolocation: { latitude: 37.7749, longitude: -122.4194 },
    permissions: ['geolocation'],
  },
  webServer: {
    command: `npx expo start --web --port ${port}`,
    url: baseURL,
    timeout: 300_000,
    // Metro inlines EXPO_PUBLIC_* at bundle time so `useLocation` can bypass real GPS on web E2E.
    env: {
      ...process.env,
      EXPO_PUBLIC_SKYCAST_E2E_WEB: '1',
    },
    // Default false: reused dev servers may lack EXPO_PUBLIC_SKYCAST_E2E_WEB, so location never resolves.
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
