import { usePressureAlert } from '@/src/hooks/usePressureAlert'
import type { HourlyWeather } from '@/src/types/weather'
import { renderHook } from '@/src/utils/testHookHarness'

const NOW = new Date('2026-09-20T10:30:00.000Z')

function hourlyWith(surfacePressure: number[] | undefined, startHourIso = '2026-09-20T08'): HourlyWeather {
  const length = surfacePressure?.length ?? 6
  const time = Array.from({ length }, (_, i) => {
    const d = new Date(`${startHourIso}:00:00.000Z`)
    d.setUTCHours(d.getUTCHours() + i)
    return d.toISOString().slice(0, 16)
  })
  const zeros = Array.from({ length }, () => 0)
  return {
    time,
    temperature: zeros, apparentTemperature: zeros, precipitationProbability: zeros,
    precipitation: zeros, weatherCode: zeros, windSpeed: zeros, windGusts: zeros,
    uvIndex: zeros, cloudCover: zeros, visibility: zeros, humidity: zeros,
    surfacePressure,
  }
}

describe('usePressureAlert', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns no alert when hourly data is missing', () => {
    const result = renderHook(() => usePressureAlert(undefined))
    expect(result.current).toEqual({ alert: false, delta: 0, direction: 'falling', windowStart: 0 })
  })

  it('returns no alert when there is no surface pressure series', () => {
    const result = renderHook(() => usePressureAlert(hourlyWith(undefined)))
    expect(result.current.alert).toBe(false)
  })

  it('returns no alert for steady pressure', () => {
    const steady = [1015, 1015, 1015, 1015, 1015, 1015, 1015, 1015]
    const result = renderHook(() => usePressureAlert(hourlyWith(steady)))
    expect(result.current.alert).toBe(false)
  })

  it('detects a rapid drop starting from the current hour', () => {
    // now = 10:xx → index 2 in a series starting at 08:00; drop of 12 hPa across 3h from index 2
    const falling = [1020, 1020, 1020, 1016, 1012, 1008, 1008, 1008]
    const result = renderHook(() => usePressureAlert(hourlyWith(falling)))
    expect(result.current).toEqual({ alert: true, delta: -12, direction: 'falling', windowStart: 2 })
  })

  it('detects a rapid rise', () => {
    const rising = [1000, 1000, 1000, 1005, 1011, 1013, 1013, 1013]
    const result = renderHook(() => usePressureAlert(hourlyWith(rising)))
    expect(result.current).toEqual({ alert: true, delta: 13, direction: 'rising', windowStart: 2 })
  })

  it('falls back to index 0 when the current hour is not in the time series', () => {
    const falling = [1020, 1016, 1012, 1008, 1008, 1008, 1008, 1008]
    const result = renderHook(() => usePressureAlert(hourlyWith(falling, '2026-01-01T00')))
    expect(result.current).toEqual({ alert: true, delta: -12, direction: 'falling', windowStart: 0 })
  })
})
