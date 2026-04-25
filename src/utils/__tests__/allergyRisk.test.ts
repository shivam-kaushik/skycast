import { computeAllergyRisk } from '@/src/utils/allergyRisk'
import type { AirQualityData } from '@/src/types/weather'

function makeHourly(overrides: Partial<AirQualityData['hourly']> = {}): AirQualityData['hourly'] {
  const n = 24
  return {
    time: Array.from({ length: n }, (_, i) => `2026-04-19T${String(i).padStart(2, '0')}:00`),
    pm10: Array(n).fill(5),
    pm25: Array(n).fill(3),
    no2: Array(n).fill(10),
    ozone: Array(n).fill(40),
    alderPollen: Array(n).fill(null),
    birchPollen: Array(n).fill(null),
    grassPollen: Array(n).fill(null),
    mugwortPollen: Array(n).fill(null),
    olivePollen: Array(n).fill(null),
    ragweedPollen: Array(n).fill(null),
    ...overrides,
  }
}

describe('computeAllergyRisk', () => {
  it('returns Low when all pollen is null', () => {
    const result = computeAllergyRisk(makeHourly(), 0, 50, 10)
    expect(result.label).toBe('Low')
    expect(result.dominantAllergen).toBeNull()
  })

  it('returns Moderate or High for grass pollen ~25 grains', () => {
    const hourly = makeHourly({ grassPollen: Array(24).fill(25) })
    const result = computeAllergyRisk(hourly, 0, 50, 10)
    expect(['High', 'Moderate']).toContain(result.label)
    expect(result.dominantAllergen).toBe('Grass')
  })

  it('humidity > 70 raises score', () => {
    const h = makeHourly({ grassPollen: Array(24).fill(25) })
    const low = computeAllergyRisk(h, 0, 50, 10)
    const high = computeAllergyRisk(h, 0, 80, 10)
    expect(high.score).toBeGreaterThan(low.score)
  })

  it('high wind (>20 km/h) reduces score by 0.5', () => {
    const h = makeHourly({ grassPollen: Array(24).fill(25) })
    const calm = computeAllergyRisk(h, 0, 50, 10)
    const windy = computeAllergyRisk(h, 0, 50, 25)
    expect(windy.score).toBeLessThan(calm.score)
  })
})
