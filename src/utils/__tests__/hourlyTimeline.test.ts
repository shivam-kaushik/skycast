import type { DailyWeather, HourlyWeather } from '@/src/types/weather'
import {
  chartPointsFromSlots,
  mergeHourlyWithSunEvents,
  tempRangeForChart,
} from '@/src/utils/hourlyTimeline'

function mockHourly(times: string[], temps: number[]): HourlyWeather {
  const n = times.length
  const z = (): number[] => Array(n).fill(0)
  return {
    time: times,
    temperature: temps,
    apparentTemperature: z(),
    precipitationProbability: z(),
    precipitation: z(),
    weatherCode: z(),
    windSpeed: z(),
    windGusts: z(),
    uvIndex: z(),
    cloudCover: z(),
    visibility: z(),
    humidity: z(),
  }
}

function mockDaily(sunrise: string[], sunset: string[]): DailyWeather {
  return {
    time: ['2026-06-15'],
    tempMax: [20],
    tempMin: [10],
    weatherCode: [0],
    precipitationSum: [0],
    precipitationProbabilityMax: [0],
    windSpeedMax: [10],
    windGustsMax: [12],
    uvIndexMax: [5],
    sunrise,
    sunset,
  }
}

describe('mergeHourlyWithSunEvents', () => {
  it('interleaves sunset between hours when inside the window', () => {
    const hourly = mockHourly(
      ['2026-06-15T19:00:00', '2026-06-15T20:00:00', '2026-06-15T21:00:00'],
      [22, 20, 18],
    )
    const daily = mockDaily(['2026-06-15T06:00:00'], ['2026-06-15T19:46:00'])
    const slots = mergeHourlyWithSunEvents(hourly, daily, 0, 3)
    expect(slots.map((s) => s.kind)).toEqual(['hour', 'sunset', 'hour', 'hour'])
    expect(slots[1]).toMatchObject({ kind: 'sunset' })
  })

  it('omits sun events outside the hourly window', () => {
    const hourly = mockHourly(['2026-06-15T12:00:00'], [20])
    const daily = mockDaily(['2026-06-15T06:00:00'], ['2026-06-15T20:00:00'])
    const slots = mergeHourlyWithSunEvents(hourly, daily, 0, 1)
    expect(slots.every((s) => s.kind === 'hour')).toBe(true)
  })
})

describe('chartPointsFromSlots', () => {
  it('only includes hour columns for the line graph', () => {
    const hourly = mockHourly(
      ['2026-06-15T19:00:00', '2026-06-15T20:00:00'],
      [22, 20],
    )
    const slots = [
      { kind: 'hour' as const, timeIso: hourly.time[0], hourlyIdx: 0 },
      { kind: 'sunset' as const, timeIso: '2026-06-15T19:46:00' },
      { kind: 'hour' as const, timeIso: hourly.time[1], hourlyIdx: 1 },
    ]
    const pts = chartPointsFromSlots(slots, hourly)
    expect(pts.map((p) => p.colIndex)).toEqual([0, 2])
  })
})

describe('tempRangeForChart', () => {
  it('expands flat ranges slightly', () => {
    const r = tempRangeForChart([{ colIndex: 0, temp: 20, hourlyIdx: 0 }])
    expect(r.max - r.min).toBeGreaterThanOrEqual(1)
  })
})
