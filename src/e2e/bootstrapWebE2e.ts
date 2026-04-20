import { Platform } from 'react-native'

/**
 * Sets `globalThis.__SKYCAST_E2E_WEB` from the URL (same JS realm as the Metro bundle).
 * Store seeding runs in `LocationBootstrap` (`app/_layout.tsx`) on the client — import-time
 * bootstrap can run under Node SSR where `sessionStorage` / `navigator` are absent.
 */
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('skycast_e2e') === '1') {
      const g = globalThis as unknown as Record<string, unknown>
      g.__SKYCAST_E2E_WEB = true
      try {
        sessionStorage.setItem('__skycast_e2e_web', '1')
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore invalid URLs
  }
}
