import { expect, test, type Page } from '@playwright/test'
import { installSkycastApiMocks } from './fixtures/apiMocks'
import { installBrowserGeolocationStub } from './fixtures/geolocation'
import { gotoHomePrimedForE2e } from './fixtures/primeWebE2e'

async function goHomeLoaded(page: Page): Promise<void> {
  await installBrowserGeolocationStub(page)
  await installSkycastApiMocks(page)
  await gotoHomePrimedForE2e(page)
  await expect(page.getByText(/hourly forecast/i)).toBeVisible({ timeout: 90_000 })
}

test.describe('Skycast feature coverage', () => {
  test('home shows forecast sections and daily brief', async ({ page }) => {
    await goHomeLoaded(page)
    await expect(page.getByText('Daily Brief')).toBeVisible()
    await expect(page.getByText('14-Day Forecast')).toBeVisible()
    await expect(page.getByText('Conditions')).toBeVisible()
  })

  test('home toggles temperature unit C/F', async ({ page }) => {
    await goHomeLoaded(page)
    await expect(page.getByText(/celsius/i)).toBeVisible()
    await page.getByTestId('home-unit-toggle').click()
    await expect(page.getByText(/fahrenheit/i)).toBeVisible()
    await page.getByTestId('home-unit-toggle').click()
    await expect(page.getByText(/celsius/i)).toBeVisible()
  })

  test('home opens location picker and closes', async ({ page }) => {
    await goHomeLoaded(page)
    await page.getByTestId('home-location-trigger').click()
    await expect(page.getByText('Locations')).toBeVisible()
    await expect(page.getByText('Use current location')).toBeVisible()
    await page.getByTestId('location-picker-close').click()
    await expect(page.getByText('Locations')).not.toBeVisible()
  })

  test('home location search selects a mocked place', async ({ page }) => {
    await installBrowserGeolocationStub(page)
    await installSkycastApiMocks(page)
    await page.route('**/geocoding-api.open-meteo.com/v1/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              id: 900001,
              name: 'Testville',
              latitude: 48.8566,
              longitude: 2.3522,
              country: 'Testland',
              admin1: 'Test Region',
            },
          ],
        }),
      })
    })
    await gotoHomePrimedForE2e(page)
    await expect(page.getByText(/hourly forecast/i)).toBeVisible({ timeout: 90_000 })

    await page.getByTestId('home-location-trigger').click()
    await page.getByTestId('location-picker-search').fill('Te')
    await expect(page.getByText('Type at least 2 letters')).toBeVisible()
    await page.getByTestId('location-picker-search').fill('Test')
    await expect(page.getByText('Testville')).toBeVisible({ timeout: 15_000 })
    await page.getByText('Testville').click()
    await expect(page.getByText('Locations')).not.toBeVisible()
    await expect(page.getByText('Testville').first()).toBeVisible()
  })

  test('air tab shows pollutant and pollen sections', async ({ page }) => {
    await goHomeLoaded(page)
    await page.getByTestId('tab-air').click()
    await expect(page.getByText('Pollutant Breakdown')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Allergen Outlook')).toBeVisible()
    await expect(page.getByText('European AQI')).toBeVisible()
  })

  test('air screen can open radar from map CTA', async ({ page }) => {
    await goHomeLoaded(page)
    await page.getByTestId('tab-air').click()
    await expect(page.getByText('View Air Quality Map')).toBeVisible({ timeout: 30_000 })
    await page.getByTestId('air-nav-radar-button').click()
    await expect(page.getByTestId('radar-layer-trigger')).toBeVisible({ timeout: 30_000 })
  })

  test('radar shows layer menu and switches to Wind layer', async ({ page }) => {
    await goHomeLoaded(page)
    await page.getByTestId('tab-radar').click()
    await expect(page.getByTestId('radar-layer-trigger')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('radar-layer-trigger')).toContainText('Radar')
    await page.getByTestId('radar-layer-trigger').click()
    await page.getByText('Wind', { exact: true }).click()
    await expect(page.getByTestId('radar-layer-trigger')).toContainText('Wind')
  })

  test('radar toggles map and globe view', async ({ page }) => {
    await goHomeLoaded(page)
    await page.getByTestId('tab-radar').click()
    await expect(page.getByTestId('radar-view-toggle')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Map time|Syncing radar/)).toBeVisible({ timeout: 45_000 })
    await page.getByTestId('radar-view-toggle').click()
    await expect(page.getByText(/Map time|Syncing radar/)).not.toBeVisible()
    await page.getByTestId('radar-view-toggle').click()
    await expect(page.getByText(/Map time|Syncing radar/)).toBeVisible({ timeout: 45_000 })
  })

  test('radar opens location picker from header', async ({ page }) => {
    await goHomeLoaded(page)
    await page.getByTestId('tab-radar').click()
    await expect(page.getByTestId('radar-location-trigger')).toBeVisible({ timeout: 30_000 })
    await page.getByTestId('radar-location-trigger').click()
    await expect(page.getByText('Locations')).toBeVisible()
    await page.getByTestId('location-picker-close').click()
  })

  test('more tab shows health, activities, and history', async ({ page }) => {
    await goHomeLoaded(page)
    await page.getByTestId('tab-more').click()
    await expect(page.getByText('Health & comfort')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText("Today's Activity Scores")).toBeVisible()
    await expect(page.getByText('Running')).toBeVisible()
    await expect(page.getByText('Recent history (ERA5)')).toBeVisible()
    await expect(page.getByText(/ERA5 from Open-Meteo/)).toBeVisible({ timeout: 30_000 })
  })

  test('more tab switches display units with pills', async ({ page }) => {
    await goHomeLoaded(page)
    await page.getByTestId('tab-more').click()
    await expect(page.getByText('Display units')).toBeVisible({ timeout: 30_000 })
    await page.getByText('Fahrenheit', { exact: true }).click()
    await page.getByText('Celsius', { exact: true }).click()
    await page.getByTestId('tab-index').click()
    await expect(page.getByText(/celsius/i)).toBeVisible()
  })

  test('more tab toggles rain alert subscription', async ({ page }) => {
    await goHomeLoaded(page)
    await page.getByTestId('tab-more').click()
    await expect(page.getByText('Alert subscriptions')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Rain & Storms')).toBeVisible()
    const switches = page.getByRole('switch')
    const count = await switches.count()
    expect(count).toBeGreaterThanOrEqual(1)
    const first = switches.first()
    const before = await first.isChecked().catch(() => false)
    await first.click()
    const after = await first.isChecked()
    expect(after).toBe(!before)
  })

  test('home shows hero temperature after load', async ({ page }) => {
    await goHomeLoaded(page)
    await expect(page.getByText("It's")).toBeVisible()
    await expect(page.getByText('°', { exact: true }).first()).toBeVisible()
  })
})
