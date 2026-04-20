import type { Page } from '@playwright/test'

/** Enough hourly steps for forecast UI (14 days × 24h). */
const DEFAULT_HOURLY_COUNT = 336

export function buildHourlyTimes(count = DEFAULT_HOURLY_COUNT): string[] {
  const start = new Date()
  start.setMinutes(0, 0, 0)
  return Array.from({ length: count }, (_, index) => {
    const value = new Date(start)
    value.setHours(start.getHours() + index)
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    const hour = String(value.getHours()).padStart(2, '0')
    return `${year}-${month}-${day}T${hour}:00`
  })
}

export function buildDailyTimes(days = 14): string[] {
  const start = new Date()
  return Array.from({ length: days }, (_, index) => {
    const value = new Date(start)
    value.setDate(start.getDate() + index)
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })
}

function era5DaysFromUrl(url: string): string[] {
  try {
    const parsed = new URL(url)
    const startStr = parsed.searchParams.get('start_date')
    const endStr = parsed.searchParams.get('end_date')
    if (!startStr || !endStr) return buildDailyTimes(7)
    const days: string[] = []
    const cursor = new Date(`${startStr}T12:00:00`)
    const end = new Date(`${endStr}T12:00:00`)
    while (cursor <= end) {
      const y = cursor.getFullYear()
      const m = String(cursor.getMonth() + 1).padStart(2, '0')
      const d = String(cursor.getDate()).padStart(2, '0')
      days.push(`${y}-${m}-${d}`)
      cursor.setDate(cursor.getDate() + 1)
    }
    return days.length > 0 ? days : buildDailyTimes(7)
  } catch {
    return buildDailyTimes(7)
  }
}

/**
 * Stubs Open-Meteo (forecast, air, ERA5) and geocoding search so E2E is fast and deterministic.
 */
export async function installSkycastApiMocks(page: Page): Promise<void> {
  const hourlyTimes = buildHourlyTimes()
  const dailyTimes = buildDailyTimes()

  await page.route('**/api.open-meteo.com/v1/forecast**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        latitude: 37.7749,
        longitude: -122.4194,
        current: {
          temperature_2m: 18,
          apparent_temperature: 17,
          relative_humidity_2m: 65,
          precipitation_probability: 10,
          weathercode: 1,
          windspeed_10m: 12,
          winddirection_10m: 280,
          windgusts_10m: 18,
          surface_pressure: 1015,
          visibility: 15000,
          uv_index: 4,
          cloud_cover: 20,
        },
        hourly: {
          time: hourlyTimes,
          temperature_2m: hourlyTimes.map(() => 18),
          apparent_temperature: hourlyTimes.map(() => 17),
          precipitation_probability: hourlyTimes.map(() => 20),
          precipitation: hourlyTimes.map(() => 0),
          weathercode: hourlyTimes.map(() => 1),
          windspeed_10m: hourlyTimes.map(() => 12),
          windgusts_10m: hourlyTimes.map(() => 18),
          uv_index: hourlyTimes.map(() => 4),
          cloud_cover: hourlyTimes.map(() => 20),
          visibility: hourlyTimes.map(() => 15000),
          relativehumidity_2m: hourlyTimes.map(() => 65),
        },
        daily: {
          time: dailyTimes,
          temperature_2m_max: dailyTimes.map(() => 22),
          temperature_2m_min: dailyTimes.map(() => 13),
          weathercode: dailyTimes.map(() => 1),
          precipitation_sum: dailyTimes.map(() => 0),
          precipitation_probability_max: dailyTimes.map(() => 25),
          windspeed_10m_max: dailyTimes.map(() => 20),
          windgusts_10m_max: dailyTimes.map(() => 30),
          uv_index_max: dailyTimes.map(() => 6),
          sunrise: dailyTimes.map((day) => `${day}T06:30`),
          sunset: dailyTimes.map((day) => `${day}T19:30`),
        },
      }),
    })
  })

  await page.route('**/air-quality-api.open-meteo.com/v1/air-quality**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        latitude: 37.7749,
        longitude: -122.4194,
        current: {
          pm10: 12,
          pm2_5: 8,
          carbon_monoxide: 220,
          nitrogen_dioxide: 14,
          ozone: 52,
          sulphur_dioxide: 2,
          us_aqi: 38,
          european_aqi: 22,
        },
        hourly: {
          time: hourlyTimes,
          pm10: hourlyTimes.map(() => 12),
          pm2_5: hourlyTimes.map(() => 8),
          nitrogen_dioxide: hourlyTimes.map(() => 14),
          ozone: hourlyTimes.map(() => 52),
          alder_pollen: hourlyTimes.map(() => 1),
          birch_pollen: hourlyTimes.map(() => 2),
          grass_pollen: hourlyTimes.map(() => 3),
          mugwort_pollen: hourlyTimes.map(() => 0),
          olive_pollen: hourlyTimes.map(() => 1),
          ragweed_pollen: hourlyTimes.map(() => 0),
        },
      }),
    })
  })

  await page.route('**/archive-api.open-meteo.com/v1/era5**', async (route) => {
    const url = route.request().url()
    const times = era5DaysFromUrl(url)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        daily: {
          time: times,
          temperature_2m_max: times.map(() => 20),
          temperature_2m_min: times.map(() => 12),
          precipitation_sum: times.map(() => 1),
          windspeed_10m_max: times.map(() => 15),
        },
      }),
    })
  })

  await page.route('**/geocoding-api.open-meteo.com/v1/search**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: [
          {
            id: 2643743,
            name: 'London',
            latitude: 51.5074,
            longitude: -0.1278,
            country: 'United Kingdom',
            admin1: 'England',
          },
          {
            id: 44418,
            name: 'London',
            latitude: 42.9834,
            longitude: -81.233,
            country: 'Canada',
            admin1: 'Ontario',
          },
        ],
      }),
    })
  })
}
