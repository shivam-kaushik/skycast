import {
  airQualityHourIndex,
  buildHealthInsights,
  maxPollenLevelAtHour,
} from '@/src/utils/healthInsights'
import type { AirQualityData, CurrentWeather } from '@/src/types/weather'

function makeCurrent(overrides: Partial<CurrentWeather> = {}): CurrentWeather {
  return {
    temperature: 22,
    apparentTemperature: 22,
    humidity: 50,
    precipitationProbability: 0,
    weatherCode: 0,
    windSpeed: 10,
    windDirection: 180,
    windGusts: 15,
    pressure: 1015,
    visibility: 10,
    uvIndex: 3,
    cloudCover: 20,
    ...overrides,
  }
}

function makeHourly(overrides: Partial<AirQualityData['hourly']> = {}): AirQualityData['hourly'] {
  const t = ['2026-04-01T12:00']
  return {
    time: t,
    pm10: [1],
    pm25: [1],
    no2: [1],
    ozone: [1],
    alderPollen: [null],
    birchPollen: [null],
    grassPollen: [null],
    mugwortPollen: [null],
    olivePollen: [null],
    ragweedPollen: [null],
    ...overrides,
  }
}

describe('maxPollenLevelAtHour', () => {
  it('returns unavailable when all pollen is null', () => {
    expect(maxPollenLevelAtHour(makeHourly(), 0)).toBe('unavailable')
  })

  it('returns level for max present pollen', () => {
    const h = makeHourly({ grassPollen: [80], birchPollen: [10] })
    expect(maxPollenLevelAtHour(h, 0)).toBe('High')
  })
})

describe('airQualityHourIndex', () => {
  it('returns 0 when no hour matches prefix', () => {
    expect(airQualityHourIndex([])).toBe(0)
  })
})

describe('buildHealthInsights', () => {
  it('adds AQI advice when moderate or worse', () => {
    const air: AirQualityData['current'] = {
      pm10: 20,
      pm25: 25,
      co: 1,
      no2: 15,
      ozone: 40,
      so2: 2,
      usAqi: 75,
      europeanAqi: 60,
    }
    const lines = buildHealthInsights(makeCurrent(), air, 'unavailable')
    expect(lines.some((l) => l.toLowerCase().includes('sensitive'))).toBe(true)
  })

  it('mentions mild conditions when nothing triggers', () => {
    const air: AirQualityData['current'] = {
      pm10: 10,
      pm25: 12,
      co: 1,
      no2: 8,
      ozone: 30,
      so2: 1,
      usAqi: 25,
      europeanAqi: 20,
    }
    const lines = buildHealthInsights(makeCurrent(), air, 'None')
    expect(lines.some((l) => l.includes('comfortable'))).toBe(true)
  })
})
