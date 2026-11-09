import type { WeatherContext } from '@/src/api/openai'

/** A complete, valid WeatherContext for component tests. Override any top-level field. */
export function weatherContext(overrides: Partial<WeatherContext> = {}): WeatherContext {
  return {
    current: {
      temperature: 22, apparentTemperature: 21, humidity: 60,
      precipitationProbability: 10, weatherCode: 0, windSpeed: 12,
      windDirection: 180, windGusts: 18, pressure: 1013,
      visibility: 10, uvIndex: 3, cloudCover: 20,
    },
    hourly: {
      time: ['2026-01-01T00:00', '2026-01-01T01:00'],
      temperature: [20, 21],
      apparentTemperature: [19, 20],
      precipitationProbability: [10, 15],
      precipitation: [0, 0],
      weatherCode: [0, 0],
      windSpeed: [10, 12],
      windGusts: [15, 18],
      uvIndex: [2, 3],
      cloudCover: [20, 25],
      visibility: [10, 10],
      humidity: [60, 62],
    },
    daily: {
      time: ['2026-01-01'],
      tempMax: [25],
      tempMin: [15],
      weatherCode: [0],
      precipitationSum: [0],
      precipitationProbabilityMax: [10],
      windSpeedMax: [20],
      windGustsMax: [30],
      uvIndexMax: [4],
      sunrise: ['2026-01-01T06:00'],
      sunset: ['2026-01-01T18:00'],
    },
    persona: 'athlete',
    unit: 'C',
    ...overrides,
  }
}

/** A promise you resolve/reject from the test, for asserting in-flight (loading) UI. */
export function deferred<T = void>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
