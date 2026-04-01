import { buildHistoryBrief } from '@/src/utils/historyBrief'
import type { DailyWeather, Era5DailyWeather } from '@/src/types/weather'

function era5Fixture(overrides: Partial<Era5DailyWeather> = {}): Era5DailyWeather {
  return {
    time: ['2026-03-20', '2026-03-21', '2026-03-22'],
    tempMax: [10, 10, 10],
    tempMin: [2, 2, 2],
    precipitationSum: [0, 0.6, 0],
    windSpeedMax: [10, 12, 11],
    ...overrides,
  }
}

function dailyFixture(tempMaxFirst: number): DailyWeather {
  return {
    time: ['2026-04-01', '2026-04-02'],
    tempMax: [tempMaxFirst, 12],
    tempMin: [5, 6],
    weatherCode: [0, 0],
    precipitationSum: [0, 0],
    precipitationProbabilityMax: [0, 10],
    windSpeedMax: [10, 10],
    windGustsMax: [15, 15],
    uvIndexMax: [3, 4],
    sunrise: ['', ''],
    sunset: ['', ''],
  }
}

describe('buildHistoryBrief', () => {
  it('includes period range and comparison when today is warmer', () => {
    const result = buildHistoryBrief(era5Fixture(), dailyFixture(18), 'C')
    expect(result.periodRange).toContain('2026-03-20')
    expect(result.lines.some((l) => l.includes('warmer'))).toBe(true)
  })

  it('mentions cooler outlook when today is below average', () => {
    const result = buildHistoryBrief(era5Fixture({ tempMax: [20, 20, 20] }), dailyFixture(10), 'C')
    expect(result.lines.some((l) => l.includes('cooler'))).toBe(true)
  })
})
