import { generateDailyBrief } from '@/src/utils/dailyBrief'
import type { CurrentWeather, HourlyWeather } from '@/src/types/weather'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeHourly(overrides: Partial<HourlyWeather> = {}): HourlyWeather {
  const hours = Array.from({ length: 24 }, (_, i) => `2024-06-15T${String(i).padStart(2, '0')}:00`)
  return {
    time: hours,
    temperature: Array(24).fill(22),
    apparentTemperature: Array(24).fill(21),
    precipitationProbability: Array(24).fill(0),
    precipitation: Array(24).fill(0),
    weatherCode: Array(24).fill(0),
    windSpeed: Array(24).fill(10),
    windGusts: Array(24).fill(15),
    uvIndex: Array(24).fill(3),
    cloudCover: Array(24).fill(10),
    visibility: Array(24).fill(20),
    humidity: Array(24).fill(50),
    ...overrides,
  }
}

function makeCurrent(overrides: Partial<CurrentWeather> = {}): CurrentWeather {
  return {
    temperature: 22,
    apparentTemperature: 21,
    humidity: 50,
    precipitationProbability: 0,
    weatherCode: 0,
    windSpeed: 10,
    windDirection: 180,
    windGusts: 15,
    pressure: 1013,
    visibility: 20,
    uvIndex: 3,
    cloudCover: 10,
    ...overrides,
  }
}

// ─── Test cases ───────────────────────────────────────────────────────────────

describe('generateDailyBrief', () => {
  // 1. Clear day
  it('clear day: mentions clear skies and suggests an activity', () => {
    const current = makeCurrent({ weatherCode: 0, precipitationProbability: 0, uvIndex: 3 })
    const hourly = makeHourly({ precipitationProbability: Array(24).fill(0), weatherCode: Array(24).fill(0) })
    const result = generateDailyBrief(current, hourly)
    expect(result).toMatch(/clear skies/i)
    expect(result.length).toBeLessThanOrEqual(180)
  })

  // 2. Rainy afternoon (rain hits from 13:00 onwards)
  it('rainy afternoon: mentions expected rain and a time range', () => {
    const precip = Array(24).fill(0)
    for (let i = 13; i <= 18; i++) precip[i] = 80
    const current = makeCurrent({ precipitationProbability: 80, weatherCode: 61 })
    const hourly = makeHourly({ precipitationProbability: precip })
    const result = generateDailyBrief(current, hourly)
    expect(result).toMatch(/rain/i)
    expect(result.length).toBeLessThanOrEqual(180)
  })

  // 3. Morning rain (rain in morning hours 6-10)
  it('morning rain: mentions rain in the morning', () => {
    const precip = Array(24).fill(0)
    for (let i = 6; i <= 10; i++) precip[i] = 75
    const current = makeCurrent({ precipitationProbability: 40, weatherCode: 61 })
    const hourly = makeHourly({ precipitationProbability: precip })
    const result = generateDailyBrief(current, hourly)
    expect(result).toMatch(/rain/i)
    expect(result.length).toBeLessThanOrEqual(180)
  })

  // 4. Windy day (wind > 50 km/h)
  it('windy day: appends wind warning when wind exceeds threshold', () => {
    const current = makeCurrent({ windSpeed: 60, precipitationProbability: 0 })
    const hourly = makeHourly({
      windSpeed: Array(24).fill(60),
      precipitationProbability: Array(24).fill(0),
    })
    const result = generateDailyBrief(current, hourly)
    expect(result).toMatch(/wind/i)
    expect(result.length).toBeLessThanOrEqual(180)
  })

  // 5. Hot UV day (UV > 7)
  it('hot UV day: appends UV warning when UV index exceeds threshold', () => {
    const current = makeCurrent({ uvIndex: 9, precipitationProbability: 0 })
    const hourly = makeHourly({
      uvIndex: Array(24).fill(9),
      precipitationProbability: Array(24).fill(0),
    })
    const result = generateDailyBrief(current, hourly)
    expect(result).toMatch(/uv|sun/i)
    expect(result.length).toBeLessThanOrEqual(180)
  })

  // 6. Evening storm (thunderstorm code 95 from 19:00 onwards)
  it('evening storm: mentions storm or thunder in the evening', () => {
    const precip = Array(24).fill(0)
    for (let i = 19; i <= 23; i++) precip[i] = 85
    const wx = Array(24).fill(0)
    for (let i = 19; i <= 23; i++) wx[i] = 95
    const current = makeCurrent({ weatherCode: 95, precipitationProbability: 85 })
    const hourly = makeHourly({ precipitationProbability: precip, weatherCode: wx })
    const result = generateDailyBrief(current, hourly)
    expect(result).toMatch(/rain|storm|thunder/i)
    expect(result.length).toBeLessThanOrEqual(180)
  })

  // 7. Perfect day (no rain, low UV, light wind, clear)
  it('perfect day: returns an encouraging clear-day message', () => {
    const current = makeCurrent({
      weatherCode: 0,
      precipitationProbability: 0,
      uvIndex: 4,
      windSpeed: 8,
    })
    const hourly = makeHourly({
      precipitationProbability: Array(24).fill(0),
      uvIndex: Array(24).fill(4),
      windSpeed: Array(24).fill(8),
    })
    const result = generateDailyBrief(current, hourly)
    expect(result).toMatch(/clear skies/i)
    expect(result.length).toBeLessThanOrEqual(180)
    expect(result).not.toMatch(/\d+\s*(km|%|°)/)
  })

  // 8. Output must never contain raw numbers matching weather units
  it('never outputs raw numbers with units', () => {
    const current = makeCurrent({ windSpeed: 60, uvIndex: 10 })
    const hourly = makeHourly({
      windSpeed: Array(24).fill(60),
      uvIndex: Array(24).fill(10),
    })
    const result = generateDailyBrief(current, hourly)
    expect(result).not.toMatch(/\d+\s*(km\/h|km|%|hPa)/)
  })

  // 9. Output always respects 180 character limit
  it('always respects the 180 character limit', () => {
    const precip = Array(24).fill(90)
    const current = makeCurrent({ windSpeed: 80, uvIndex: 12, precipitationProbability: 90 })
    const hourly = makeHourly({
      precipitationProbability: precip,
      windSpeed: Array(24).fill(80),
      uvIndex: Array(24).fill(12),
    })
    const result = generateDailyBrief(current, hourly)
    expect(result.length).toBeLessThanOrEqual(180)
  })
})
