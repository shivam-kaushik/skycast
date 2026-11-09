import { useRainBar } from '@/src/hooks/useRainBar'
import type { HourlyWeather } from '@/src/types/weather'
import { renderHook } from '@/src/utils/testHookHarness'

const NOW = new Date('2026-09-20T10:30:00.000Z')

function hourlyWithRain(precipitationProbability: number[]): HourlyWeather {
  const length = precipitationProbability.length
  const time = Array.from({ length }, (_, i) => {
    const d = new Date('2026-09-20T08:00:00.000Z')
    d.setUTCHours(d.getUTCHours() + i)
    return d.toISOString().slice(0, 16) + ':00.000Z'
  })
  const zeros = Array.from({ length }, () => 0)
  return {
    time,
    temperature: zeros, apparentTemperature: zeros, precipitationProbability,
    precipitation: zeros, weatherCode: zeros, windSpeed: zeros, windGusts: zeros,
    uvIndex: zeros, cloudCover: zeros, visibility: zeros, humidity: zeros,
  }
}

describe('useRainBar', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns an empty result when hourly data is missing', () => {
    const result = renderHook(() => useRainBar(undefined))
    expect(result.current).toEqual({ segments: [], peakProbability: 0, peakTime: null })
  })

  it('builds 12 fifteen-minute segments covering the next 3 hours', () => {
    const result = renderHook(() => useRainBar(hourlyWithRain([0, 0, 0, 0, 0, 0, 0, 0])))
    expect(result.current.segments).toHaveLength(12)
  })

  it('reports a peak time of null when the peak is below 10%', () => {
    const result = renderHook(() => useRainBar(hourlyWithRain([0, 0, 5, 5, 5, 5, 5, 5])))
    expect(result.current.peakProbability).toBe(5)
    expect(result.current.peakTime).toBeNull()
  })

  it('interpolates probability linearly between hours', () => {
    // now → index 2 (10:00). Hour 2 = 0%, hour 3 = 40% → +10% every 15 minutes.
    const result = renderHook(() => useRainBar(hourlyWithRain([0, 0, 0, 40, 40, 40, 40, 40])))
    const probs = result.current.segments.slice(0, 5).map((s) => s.probability)
    expect(probs).toEqual([0, 10, 20, 30, 40])
  })

  it('reports the earliest segment at the peak probability as peakTime', () => {
    const result = renderHook(() => useRainBar(hourlyWithRain([0, 0, 0, 60, 60, 60, 60, 60])))
    expect(result.current.peakProbability).toBe(60)
    // 60% is first reached at the start of hour 3 (11:00Z) = segment index 4
    expect(result.current.peakTime).toEqual(result.current.segments[4]?.time)
    expect(result.current.peakTime?.toISOString()).toBe('2026-09-20T11:00:00.000Z')
  })

  it('stays within bounds when the series ends before the window does', () => {
    const result = renderHook(() => useRainBar(hourlyWithRain([0, 0, 30])))
    expect(result.current.segments).toHaveLength(12)
    for (const seg of result.current.segments) {
      expect(Number.isFinite(seg.probability)).toBe(true)
    }
  })
})
