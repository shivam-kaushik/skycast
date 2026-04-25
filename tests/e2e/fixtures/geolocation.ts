import type { Page } from '@playwright/test'

/**
 * Marks the web bundle so `useLocation` uses a fixed lat/lon (see `isPlaywrightWebE2E`).
 * Also stubs Geolocation for any code paths that still call the browser API.
 */
export async function installBrowserGeolocationStub(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      Object.defineProperty(navigator, 'webdriver', { get: () => true, configurable: true })
    } catch {
      /* may already be defined */
    }
    try {
      sessionStorage.setItem('__skycast_e2e_web', '1')
    } catch {
      /* ignore (e.g. storage blocked) */
    }
    try {
      localStorage.setItem('__skycast_e2e_web', '1')
    } catch {
      /* ignore */
    }
    try {
      document.cookie = '__skycast_e2e_web=1; path=/; SameSite=Lax'
    } catch {
      /* ignore */
    }
    const g = globalThis as unknown as Record<string, unknown>
    g.__SKYCAST_E2E_WEB = true

    const position = {
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: null,
        accuracy: 5,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    } as GeolocationPosition

    const granted = {
      state: 'granted',
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as PermissionStatus

    if (navigator.permissions?.query) {
      navigator.permissions.query = () => Promise.resolve(granted)
    }

    navigator.geolocation.getCurrentPosition = (success) => {
      queueMicrotask(() => {
        success(position)
      })
    }
  })
}
