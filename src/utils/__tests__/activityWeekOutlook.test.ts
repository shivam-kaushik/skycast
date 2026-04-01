import { buildSevenDayActivityOutlook } from '@/src/utils/activityWeekOutlook'
import type { DailyWeather, HourlyWeather } from '@/src/types/weather'

function makeHourly(): HourlyWeather {
  const hours = Array.from({ length: 24 }, (_, i) => `2026-04-01T${String(i).padStart(2, '0')}:00`)
  return {
    time: hours,
    temperature: Array(24).fill(20),
    apparentTemperature: Array(24).fill(19),
    precipitationProbability: Array(24).fill(0),
    precipitation: Array(24).fill(0),
    weatherCode: Array(24).fill(0),
    windSpeed: Array(24).fill(8),
    windGusts: Array(24).fill(12),
    uvIndex: Array(24).fill(4),
    cloudCover: Array(24).fill(15),
    visibility: Array(24).fill(20),
    humidity: Array(24).fill(50),
  }
}

function makeDaily(): DailyWeather {
  return {
    time: [
      '2026-04-01',
      '2026-04-02',
      '2026-04-03',
      '2026-04-04',
      '2026-04-05',
      '2026-04-06',
      '2026-04-07',
      '2026-04-08',
    ],
    tempMax: Array(8).fill(18),
    tempMin: Array(8).fill(10),
    weatherCode: Array(8).fill(0),
    precipitationSum: Array(8).fill(0),
    precipitationProbabilityMax: Array(8).fill(5),
    windSpeedMax: Array(8).fill(12),
    windGustsMax: Array(8).fill(18),
    uvIndexMax: Array(8).fill(4),
    sunrise: Array(8).fill('2026-04-01T06:00'),
    sunset: Array(8).fill('2026-04-01T20:00'),
  }
}

describe('buildSevenDayActivityOutlook', () => {
  it('returns seven entries with two top activities each', () => {
    const out = buildSevenDayActivityOutlook(makeHourly(), makeDaily())
    expect(out).toHaveLength(7)
    expect(out[0]?.dayLabel).toBe('Today')
    expect(out[0]?.topActivities).toHaveLength(2)
    expect(out[0]?.topActivities[0]?.score.score).toBeGreaterThanOrEqual(0)
  })
})
