import {
  computeStargazingScore,
  computeSunsetScore,
  detectRainbowWindow,
} from '@/src/utils/skyPhenomena'
import type { HourlyWeather } from '@/src/types/weather'

function makeHourly(overrides: Partial<HourlyWeather> = {}): HourlyWeather {
  const n = 24
  const fill = (v: number) => Array(n).fill(v)
  const base = new Date('2026-04-19T12:00:00')
  const time = Array.from({ length: n }, (_, i) => {
    const d = new Date(base.getTime() + i * 3600_000)
    return d.toISOString().slice(0, 16)
  })
  return {
    time,
    temperature: fill(20),
    apparentTemperature: fill(19),
    precipitationProbability: fill(0),
    precipitation: fill(0),
    weatherCode: fill(1),
    windSpeed: fill(10),
    windGusts: fill(12),
    uvIndex: fill(3),
    cloudCover: fill(10),
    visibility: fill(20),
    humidity: fill(50),
    surfacePressure: fill(1013),
    ...overrides,
  }
}

describe('computeStargazingScore', () => {
  it('returns 10 for perfect conditions', () => {
    // base 10 - 0 (cloud) - 0 (moon) + 1 (vis bonus) = 11 → clamped to 10
    expect(computeStargazingScore(0, 0, 20)).toBe(10)
  })

  it('penalises full cloud cover (100%)', () => {
    // 10 - 10 - 0 + 1 = 1
    expect(computeStargazingScore(100, 0, 20)).toBe(1)
  })

  it('penalises full moon (illumination 1.0)', () => {
    // 10 - 0 - 3 + 1 = 8
    expect(computeStargazingScore(0, 1.0, 20)).toBe(8)
  })

  it('clamps to 0 for terrible conditions', () => {
    // 10 - 10 - 3 + 0 = -3 → 0
    expect(computeStargazingScore(100, 1.0, 0)).toBe(0)
  })
})

describe('computeSunsetScore', () => {
  it('returns base 5 for neutral conditions', () => {
    // cloud 60% (not 20-50, not >70), humidity 30 (not 40-65), wc 0 (not 1-3), precip 0
    expect(computeSunsetScore(60, 30, 0, 0)).toBe(5)
  })

  it('awards +2 for thin cloud and +1 for good humidity', () => {
    // cloud 30% (20-50 → +2), humidity 50 (40-65 → +1) = 8
    expect(computeSunsetScore(30, 50, 0, 0)).toBe(8)
  })

  it('penalises overcast (>70%)', () => {
    // cloud 80% (>70 → -3), humidity 50 (+1) = 3
    expect(computeSunsetScore(80, 50, 0, 0)).toBe(3)
  })

  it('clamps to 0', () => {
    // cloud 80% (-3), precip 90% (-2) = 0
    expect(computeSunsetScore(80, 30, 0, 90)).toBe(0)
  })
})

describe('detectRainbowWindow', () => {
  it('returns null when no rain-then-clear sequence', () => {
    const h = makeHourly({ precipitationProbability: Array(24).fill(0) })
    expect(detectRainbowWindow(h, 51.5, -0.1, 0)).toBeNull()
  })

  it('returns null when rain never clears', () => {
    const h = makeHourly({ precipitationProbability: Array(24).fill(80) })
    expect(detectRainbowWindow(h, 51.5, -0.1, 0)).toBeNull()
  })
})
