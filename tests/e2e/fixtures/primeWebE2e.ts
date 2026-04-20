import type { Page } from '@playwright/test'
import { E2E_WEB_HOME } from './e2eUrl'

/** First load can race SSR; set markers in the real page context then reload so `useLocation` sees them. */
export async function gotoHomePrimedForE2e(page: Page): Promise<void> {
  await page.goto(E2E_WEB_HOME, { waitUntil: 'domcontentloaded', timeout: 150_000 })
  await page.evaluate(() => {
    try {
      sessionStorage.setItem('__skycast_e2e_web', '1')
    } catch {
      /* ignore */
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
    ;(globalThis as unknown as { __SKYCAST_E2E_WEB?: boolean }).__SKYCAST_E2E_WEB = true
  })
  // Full remount: a second client `goto` may not re-run `useEffect`; `reload` keeps sessionStorage for same origin.
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 150_000 })
}
