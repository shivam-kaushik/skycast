import { expect, test } from '@playwright/test'
import { installSkycastApiMocks } from './fixtures/apiMocks'
import { installBrowserGeolocationStub } from './fixtures/geolocation'
import { gotoHomePrimedForE2e } from './fixtures/primeWebE2e'

test.describe('Skycast core tab flows', () => {
  test('navigates across tabs and shows key content', async ({ page }) => {
    await installBrowserGeolocationStub(page)
    await installSkycastApiMocks(page)
    await gotoHomePrimedForE2e(page)
    await expect(page.getByTestId('tab-index')).toBeVisible({ timeout: 90_000 })
    await expect(page.getByTestId('tab-radar')).toBeVisible()
    await expect(page.getByTestId('tab-air')).toBeVisible()
    await expect(page.getByTestId('tab-more')).toBeVisible()

    await page.getByTestId('tab-radar').click()
    await page.getByTestId('tab-air').click()
    await page.getByTestId('tab-more').click()
    await page.getByTestId('tab-index').click()
  })
})
