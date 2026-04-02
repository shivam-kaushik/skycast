import type { HourlyWeather } from '@/src/types/weather'
import { maxPrecipitationProbabilityNextHours } from '@/src/utils/hourlyPrecipMax'

function mockHourly(probs: number[]): HourlyWeather {
  const n = probs.length
  return {
    time: probs.map((_, i) => `2026-01-01T${String(i).padStart(2, '0')}:00`),
    temperature: Array(n).fill(5),
    apparentTemperature: Array(n).fill(4),
    precipitationProbability: probs,
    precipitation: Array(n).fill(0),
    weatherCode: Array(n).fill(3),
    windSpeed: Array(n).fill(10),
    windGusts: Array(n).fill(15),
    uvIndex: Array(n).fill(1),
    cloudCover: Array(n).fill(90),
    visibility: Array(n).fill(10),
    humidity: Array(n).fill(80),
  }
}

describe('maxPrecipitationProbabilityNextHours', () => {
  it('returns peak in window', () => {
    const h = mockHourly([10, 5, 67, 20, 30])
    expect(maxPrecipitationProbabilityNextHours(h, 5)).toBe(67)
  })

  it('respects hour limit', () => {
    const h = mockHourly([5, 90])
    expect(maxPrecipitationProbabilityNextHours(h, 1)).toBe(5)
  })
})
