import type { HourlyWeather } from '@/src/types/weather'
import {
  getAmbientVisualKind,
  hasRainishHourlyInNextHours,
  isDaytimeFromSun,
  isRainishAmbientWeatherCode,
} from '@/src/utils/ambientWeatherKind'

function hourlyWithCodes(codes: number[]): HourlyWeather {
  const n = codes.length
  const zeros = (): number[] => Array(n).fill(0)
  return {
    time: codes.map((_, i) => `2026-06-15T${String(i).padStart(2, '0')}:00:00.000Z`),
    temperature: zeros(),
    apparentTemperature: zeros(),
    precipitationProbability: zeros(),
    precipitation: zeros(),
    weatherCode: codes,
    windSpeed: zeros(),
    windGusts: zeros(),
    uvIndex: zeros(),
    cloudCover: zeros(),
    visibility: zeros(),
    humidity: zeros(),
  }
}

describe('isDaytimeFromSun', () => {
  it('returns true between sunrise and sunset', () => {
    const noon = new Date('2026-06-15T12:00:00.000Z')
    const ok = isDaytimeFromSun(
      '2026-06-15T06:00:00.000Z',
      '2026-06-15T20:00:00.000Z',
      noon,
    )
    expect(ok).toBe(true)
  })

  it('returns false at night', () => {
    const night = new Date('2026-06-15T22:00:00.000Z')
    const ok = isDaytimeFromSun(
      '2026-06-15T06:00:00.000Z',
      '2026-06-15T20:00:00.000Z',
      night,
    )
    expect(ok).toBe(false)
  })
})

describe('getAmbientVisualKind', () => {
  it('maps clear sky by day and night', () => {
    expect(getAmbientVisualKind(0, true)).toBe('clearDay')
    expect(getAmbientVisualKind(0, false)).toBe('clearNight')
  })

  it('maps precipitation and thunder', () => {
    expect(getAmbientVisualKind(65, true)).toBe('rain')
    expect(getAmbientVisualKind(95, true)).toBe('thunder')
    expect(getAmbientVisualKind(71, true)).toBe('snow')
  })

  it('maps clouds and fog', () => {
    expect(getAmbientVisualKind(3, true)).toBe('cloudy')
    expect(getAmbientVisualKind(2, true)).toBe('partlyCloudyDay')
    expect(getAmbientVisualKind(2, false)).toBe('partlyCloudyNight')
    expect(getAmbientVisualKind(45, true)).toBe('fog')
  })
})

describe('isRainishAmbientWeatherCode', () => {
  it('matches drizzle, rain, showers, and thunder', () => {
    expect(isRainishAmbientWeatherCode(51)).toBe(true)
    expect(isRainishAmbientWeatherCode(65)).toBe(true)
    expect(isRainishAmbientWeatherCode(82)).toBe(true)
    expect(isRainishAmbientWeatherCode(95)).toBe(true)
  })

  it('excludes dry / cloudy codes', () => {
    expect(isRainishAmbientWeatherCode(0)).toBe(false)
    expect(isRainishAmbientWeatherCode(3)).toBe(false)
    expect(isRainishAmbientWeatherCode(71)).toBe(false)
  })
})

describe('hasRainishHourlyInNextHours', () => {
  it('returns false when window is all overcast', () => {
    const h = hourlyWithCodes([3, 3, 3, 3])
    expect(hasRainishHourlyInNextHours(h, 12)).toBe(false)
  })

  it('returns true when a rain hour appears within the capped window', () => {
    const h = hourlyWithCodes([3, 3, 61, 3])
    expect(hasRainishHourlyInNextHours(h, 2)).toBe(false)
    expect(hasRainishHourlyInNextHours(h, 3)).toBe(true)
  })
})
