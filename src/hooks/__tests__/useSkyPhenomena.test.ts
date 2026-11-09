import SunCalc from 'suncalc'
import { useSkyPhenomena } from '@/src/hooks/useSkyPhenomena'
import { computeStargazingScore, computeSunsetScore, detectRainbowWindow } from '@/src/utils/skyPhenomena'
import type { HourlyWeather } from '@/src/types/weather'
import { renderHook } from '@/src/utils/testHookHarness'

jest.mock('suncalc', () => ({
  __esModule: true,
  default: {
    getTimes: jest.fn(),
    getMoonIllumination: jest.fn(),
  },
}))

jest.mock('@/src/utils/skyPhenomena', () => ({
  computeStargazingScore: jest.fn(),
  computeSunsetScore: jest.fn(),
  detectRainbowWindow: jest.fn(),
}))

const mockGetTimes = SunCalc.getTimes as jest.Mock
const mockMoon = SunCalc.getMoonIllumination as jest.Mock
const mockStargazing = computeStargazingScore as jest.Mock
const mockSunset = computeSunsetScore as jest.Mock
const mockRainbow = detectRainbowWindow as jest.Mock

const NOW = new Date('2026-09-20T10:30:00.000Z')
const GOLDEN_START = new Date('2026-09-20T22:30:00.000Z')
const GOLDEN_END = new Date('2026-09-20T23:30:00.000Z')

/** Hourly series starting 08:00Z, so "now" (10:30Z) maps to index 2. */
function hourly(overrides: Partial<HourlyWeather> = {}): HourlyWeather {
  const time = ['08', '09', '10', '11'].map((h) => `2026-09-20T${h}:00:00.000Z`)
  return {
    time,
    temperature: [0, 0, 0, 0],
    apparentTemperature: [0, 0, 0, 0],
    precipitationProbability: [0, 0, 35, 0],
    precipitation: [0, 0, 0, 0],
    weatherCode: [0, 0, 3, 0],
    windSpeed: [0, 0, 0, 0],
    windGusts: [0, 0, 0, 0],
    uvIndex: [0, 0, 0, 0],
    cloudCover: [90, 90, 10, 90],
    visibility: [0, 0, 24, 0],
    humidity: [0, 0, 70, 0],
    ...overrides,
  }
}

describe('useSkyPhenomena', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW)
    mockGetTimes.mockReset().mockReturnValue({ goldenHour: GOLDEN_START, goldenHourEnd: GOLDEN_END })
    mockMoon.mockReset().mockReturnValue({ fraction: 0.3, phase: 0.2, angle: 0 })
    mockStargazing.mockReset().mockReturnValue(7)
    mockSunset.mockReset().mockReturnValue(8)
    mockRainbow.mockReset().mockReturnValue(null)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns null without hourly data or coordinates', () => {
    expect(renderHook(() => useSkyPhenomena(undefined, 43, -79)).current).toBeNull()
    expect(renderHook(() => useSkyPhenomena(hourly(), null, -79)).current).toBeNull()
    expect(renderHook(() => useSkyPhenomena(hourly(), 43, null)).current).toBeNull()
  })

  it('feeds the current-hour readings into the score calculators', () => {
    renderHook(() => useSkyPhenomena(hourly(), 43, -79))

    expect(mockStargazing).toHaveBeenCalledWith(10, 0.3, 24)
    expect(mockSunset).toHaveBeenCalledWith(10, 70, 3, 35)
  })

  it('returns the computed scores and golden-hour window', () => {
    const { current } = renderHook(() => useSkyPhenomena(hourly(), 43, -79))

    expect(current).toMatchObject({
      stargazingScore: 7,
      sunsetScore: 8,
      goldenHourStart: GOLDEN_START,
      goldenHourEnd: GOLDEN_END,
      rainbowWindow: null,
    })
  })

  it('passes the hourly series, coordinates and current index to the rainbow detector', () => {
    const series = hourly()
    renderHook(() => useSkyPhenomena(series, 43, -79))
    expect(mockRainbow).toHaveBeenCalledWith(series, 43, -79, 2)
  })

  it.each([
    [0, 'Excellent'],
    [19, 'Excellent'],
    [20, 'Good'],
    [49, 'Good'],
    [50, 'Fair'],
    [100, 'Fair'],
  ] as const)('rates golden-hour quality for %p%% cloud cover as %s', (cloud, quality) => {
    const series = hourly({ cloudCover: [0, 0, cloud, 0] })
    const { current } = renderHook(() => useSkyPhenomena(series, 43, -79))
    expect(current?.goldenHourQuality).toBe(quality)
  })

  it('uses neutral defaults when the current hour has no readings', () => {
    const empty = hourly({
      cloudCover: [], humidity: [], weatherCode: [], precipitationProbability: [], visibility: [],
    })
    const { current } = renderHook(() => useSkyPhenomena(empty, 43, -79))

    expect(mockStargazing).toHaveBeenCalledWith(50, 0.3, 10)
    expect(mockSunset).toHaveBeenCalledWith(50, 50, 0, 0)
    expect(current?.goldenHourQuality).toBe('Fair')
  })
})
