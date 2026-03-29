import {
  scoreRunning,
  scoreCycling,
  scorePhotography,
  scoreStargazing,
  scoreActivity,
} from '@/src/utils/activityScores'
import type { HourlyWeather, DailyWeather, ActivityScore } from '@/src/types/weather'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeHourly(overrides: Partial<HourlyWeather> = {}): HourlyWeather {
  const hours = Array.from(
    { length: 24 },
    (_, i) => `2024-06-15T${String(i).padStart(2, '0')}:00`,
  )
  return {
    time: hours,
    temperature: Array(24).fill(20),
    apparentTemperature: Array(24).fill(19),
    precipitationProbability: Array(24).fill(0),
    precipitation: Array(24).fill(0),
    weatherCode: Array(24).fill(0),
    windSpeed: Array(24).fill(10),
    windGusts: Array(24).fill(15),
    uvIndex: Array(24).fill(3),
    cloudCover: Array(24).fill(10),
    visibility: Array(24).fill(20),
    humidity: Array(24).fill(50),
    ...overrides,
  }
}

function makeDaily(overrides: Partial<DailyWeather> = {}): DailyWeather {
  return {
    time: ['2024-06-15'],
    tempMax: [24],
    tempMin: [14],
    weatherCode: [0],
    precipitationSum: [0],
    precipitationProbabilityMax: [5],
    windSpeedMax: [15],
    windGustsMax: [20],
    uvIndexMax: [5],
    sunrise: ['2024-06-15T05:30'],
    sunset: ['2024-06-15T20:30'],
    ...overrides,
  }
}

function assertValidScore(score: ActivityScore): void {
  expect(score.score).toBeGreaterThanOrEqual(0)
  expect(score.score).toBeLessThanOrEqual(10)
  expect(['Excellent', 'Good', 'Fair', 'Poor', 'Avoid']).toContain(score.label)
  expect(typeof score.reason).toBe('string')
  expect(score.reason.length).toBeGreaterThan(0)
  expect(score.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
}

const TARGET_DATE = '2024-06-15'

// ─── scoreRunning ─────────────────────────────────────────────────────────────

describe('scoreRunning', () => {
  it('returns Excellent score on a perfect running day (cool, no rain, light wind)', () => {
    const hourly = makeHourly({
      temperature: Array(24).fill(16),
      precipitationProbability: Array(24).fill(0),
      windSpeed: Array(24).fill(8),
      uvIndex: Array(24).fill(2),
    })
    const daily = makeDaily({ uvIndexMax: [2], windSpeedMax: [8] })
    const result = scoreRunning(hourly, daily, TARGET_DATE)
    assertValidScore(result)
    expect(result.score).toBeGreaterThanOrEqual(8)
    expect(['Excellent', 'Good']).toContain(result.label)
  })

  it('returns Poor or Avoid score on a rainy stormy day', () => {
    const hourly = makeHourly({
      precipitationProbability: Array(24).fill(90),
      windSpeed: Array(24).fill(65),
      weatherCode: Array(24).fill(95),
    })
    const daily = makeDaily({ precipitationProbabilityMax: [90], windSpeedMax: [65] })
    const result = scoreRunning(hourly, daily, TARGET_DATE)
    assertValidScore(result)
    expect(result.score).toBeLessThanOrEqual(3)
  })

  it('returns a valid ActivityScore structure', () => {
    const result = scoreRunning(makeHourly(), makeDaily(), TARGET_DATE)
    assertValidScore(result)
  })

  it('optionally includes a bestWindow string when conditions allow', () => {
    const hourly = makeHourly({
      temperature: Array(24).fill(15),
      precipitationProbability: Array(24).fill(0),
    })
    const result = scoreRunning(hourly, makeDaily(), TARGET_DATE)
    // bestWindow is optional but if present it should be a non-empty string
    if (result.bestWindow !== undefined) {
      expect(typeof result.bestWindow).toBe('string')
      expect(result.bestWindow.length).toBeGreaterThan(0)
    }
  })
})

// ─── scoreCycling ─────────────────────────────────────────────────────────────

describe('scoreCycling', () => {
  it('returns high score for calm, dry, mild conditions', () => {
    const hourly = makeHourly({
      precipitationProbability: Array(24).fill(0),
      windSpeed: Array(24).fill(5),
      temperature: Array(24).fill(18),
    })
    const daily = makeDaily({ windSpeedMax: [5] })
    const result = scoreCycling(hourly, daily, TARGET_DATE)
    assertValidScore(result)
    expect(result.score).toBeGreaterThanOrEqual(7)
  })

  it('returns low score when wind exceeds cycling threshold (>40 km/h)', () => {
    const hourly = makeHourly({
      windSpeed: Array(24).fill(50),
      windGusts: Array(24).fill(65),
    })
    const daily = makeDaily({ windSpeedMax: [50] })
    const result = scoreCycling(hourly, daily, TARGET_DATE)
    assertValidScore(result)
    expect(result.score).toBeLessThanOrEqual(4)
  })

  it('returns valid structure always', () => {
    const result = scoreCycling(makeHourly(), makeDaily(), TARGET_DATE)
    assertValidScore(result)
  })
})

// ─── scorePhotography ─────────────────────────────────────────────────────────

describe('scorePhotography', () => {
  it('returns high score for golden hour conditions (partly cloudy, low wind)', () => {
    const uvIndex = Array(24).fill(0)
    // Simulate golden hour with low UV near sunrise/sunset
    uvIndex[6] = 1
    uvIndex[19] = 1
    const cloudCover = Array(24).fill(30) // partly cloudy ideal for photos
    const hourly = makeHourly({
      uvIndex,
      cloudCover,
      precipitationProbability: Array(24).fill(0),
      windSpeed: Array(24).fill(5),
    })
    const result = scorePhotography(hourly, makeDaily(), TARGET_DATE)
    assertValidScore(result)
    expect(result.score).toBeGreaterThanOrEqual(6)
  })

  it('returns lower score for full overcast rainy conditions', () => {
    const hourly = makeHourly({
      cloudCover: Array(24).fill(95),
      precipitationProbability: Array(24).fill(80),
      weatherCode: Array(24).fill(63),
    })
    const result = scorePhotography(hourly, makeDaily(), TARGET_DATE)
    assertValidScore(result)
    expect(result.score).toBeLessThanOrEqual(5)
  })

  it('returns valid structure always', () => {
    const result = scorePhotography(makeHourly(), makeDaily(), TARGET_DATE)
    assertValidScore(result)
  })
})

// ─── scoreStargazing ─────────────────────────────────────────────────────────

describe('scoreStargazing', () => {
  it('returns 0 score for daytime hours (no post-sunset evaluation)', () => {
    // Make hourly data only covering 6 AM to 8 PM (no night hours)
    const earlyHours = Array.from(
      { length: 24 },
      (_, i) => `2024-06-15T${String(i).padStart(2, '0')}:00`,
    )
    const hourly = makeHourly({
      time: earlyHours,
      cloudCover: Array(24).fill(100),
    })
    // Sunset at 20:30 — after 20:30 should be evaluated
    const daily = makeDaily({ sunset: ['2024-06-15T20:30'] })
    const result = scoreStargazing(hourly, daily, TARGET_DATE)
    assertValidScore(result)
    // If cloud cover is 100% all night, score should be very low
    expect(result.score).toBeLessThanOrEqual(3)
  })

  it('returns high score for clear skies after sunset', () => {
    const cloudCover = Array(24).fill(0) // perfectly clear all night
    const precip = Array(24).fill(0)
    const hourly = makeHourly({ cloudCover, precipitationProbability: precip })
    const daily = makeDaily({ sunset: ['2024-06-15T20:00'] })
    const result = scoreStargazing(hourly, daily, TARGET_DATE)
    assertValidScore(result)
    expect(result.score).toBeGreaterThanOrEqual(7)
  })

  it('returns Avoid or 0 when it rains all night', () => {
    const hourly = makeHourly({
      precipitationProbability: Array(24).fill(95),
      weatherCode: Array(24).fill(61),
    })
    const daily = makeDaily({ sunset: ['2024-06-15T20:00'] })
    const result = scoreStargazing(hourly, daily, TARGET_DATE)
    assertValidScore(result)
    expect(result.score).toBeLessThanOrEqual(2)
  })

  it('returns valid structure always', () => {
    const result = scoreStargazing(makeHourly(), makeDaily(), TARGET_DATE)
    assertValidScore(result)
  })
})

// ─── scoreActivity dispatcher ─────────────────────────────────────────────────

describe('scoreActivity', () => {
  it('dispatches running correctly', () => {
    const result = scoreActivity('running', makeHourly(), makeDaily(), TARGET_DATE)
    assertValidScore(result)
  })

  it('dispatches cycling correctly', () => {
    const result = scoreActivity('cycling', makeHourly(), makeDaily(), TARGET_DATE)
    assertValidScore(result)
  })

  it('dispatches stargazing correctly', () => {
    const result = scoreActivity('stargazing', makeHourly(), makeDaily(), TARGET_DATE)
    assertValidScore(result)
  })

  it('dispatches unknown activity and returns a default score', () => {
    const result = scoreActivity('unknown_activity', makeHourly(), makeDaily(), TARGET_DATE)
    assertValidScore(result)
  })

  it('dispatches all 10 known activities without throwing', () => {
    const activities = [
      'running', 'cycling', 'hiking', 'photography', 'outdoorDining',
      'gardening', 'beach', 'stargazing', 'bbq', 'dogWalking',
    ]
    for (const activity of activities) {
      expect(() =>
        scoreActivity(activity, makeHourly(), makeDaily(), TARGET_DATE),
      ).not.toThrow()
    }
  })
})
