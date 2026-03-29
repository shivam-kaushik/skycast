import {
  describeHumidity,
  describeWind,
  describeUV,
  describePressure,
  describeVisibility,
  describeAQI,
  describePollenLevel,
} from '@/src/utils/weatherDescriptions'

// ─── describeHumidity ────────────────────────────────────────────────────────

describe('describeHumidity', () => {
  it('returns comfortable description for moderate humidity (50%)', () => {
    const result = describeHumidity(50)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
    expect(result.toLowerCase()).toContain('comfortable')
  })

  it('returns dry description for low humidity (15%)', () => {
    const result = describeHumidity(15)
    expect(result.toLowerCase()).toContain('dry')
  })

  it('returns humid/muggy description for high humidity (85%)', () => {
    const result = describeHumidity(85)
    expect(result.toLowerCase()).toMatch(/humid|muggy/)
  })

  it('returns very dry description for very low humidity (5%)', () => {
    const result = describeHumidity(5)
    expect(result.toLowerCase()).toContain('very dry')
  })

  it('returns oppressive/very humid for extreme humidity (95%)', () => {
    const result = describeHumidity(95)
    expect(result.toLowerCase()).toMatch(/oppressive|very humid|extreme/)
  })
})

// ─── describeWind ────────────────────────────────────────────────────────────

describe('describeWind', () => {
  it('returns calm description for 0 km/h', () => {
    const result = describeWind(0)
    expect(result.toLowerCase()).toContain('calm')
  })

  it('returns breezy description for moderate wind (25 km/h)', () => {
    const result = describeWind(25)
    expect(result.toLowerCase()).toMatch(/breezy|light breeze|moderate/)
  })

  it('returns strong/windy description for high wind (55 km/h)', () => {
    const result = describeWind(55)
    expect(result.toLowerCase()).toMatch(/strong|windy|gusty/)
  })

  it('returns dangerous/storm description for extreme wind (100 km/h)', () => {
    const result = describeWind(100)
    expect(result.toLowerCase()).toMatch(/storm|dangerous|very strong/)
  })

  it('returns gentle description for light wind (10 km/h)', () => {
    const result = describeWind(10)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

// ─── describeUV ──────────────────────────────────────────────────────────────

describe('describeUV', () => {
  it('returns low description for UV index 1', () => {
    const result = describeUV(1)
    expect(result.toLowerCase()).toContain('low')
  })

  it('returns moderate description for UV index 4', () => {
    const result = describeUV(4)
    expect(result.toLowerCase()).toContain('moderate')
  })

  it('returns high description for UV index 7', () => {
    const result = describeUV(7)
    expect(result.toLowerCase()).toContain('high')
  })

  it('returns very high description for UV index 9', () => {
    const result = describeUV(9)
    expect(result.toLowerCase()).toContain('very high')
  })

  it('returns extreme description for UV index 12', () => {
    const result = describeUV(12)
    expect(result.toLowerCase()).toContain('extreme')
  })
})

// ─── describePressure ────────────────────────────────────────────────────────

describe('describePressure', () => {
  it('describes normal steady pressure', () => {
    const result = describePressure(1013, 'steady')
    expect(result.toLowerCase()).toMatch(/stable|steady|normal/)
  })

  it('describes rising pressure indicating improving weather', () => {
    const result = describePressure(1010, 'rising')
    expect(result.toLowerCase()).toMatch(/improving|rising|clearing/)
  })

  it('describes falling pressure indicating deteriorating weather', () => {
    const result = describePressure(1005, 'falling')
    expect(result.toLowerCase()).toMatch(/falling|deteriorat|worsening|change/)
  })

  it('describes low pressure system', () => {
    const result = describePressure(990, 'falling')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('describes high pressure system', () => {
    const result = describePressure(1030, 'steady')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

// ─── describeVisibility ──────────────────────────────────────────────────────

describe('describeVisibility', () => {
  it('returns poor visibility for very low km (0.2)', () => {
    const result = describeVisibility(0.2)
    expect(result.toLowerCase()).toMatch(/dense fog|very poor|near zero/)
  })

  it('returns foggy/poor for low visibility (1 km)', () => {
    const result = describeVisibility(1)
    expect(result.toLowerCase()).toMatch(/fog|poor|reduced/)
  })

  it('returns moderate description for 5 km visibility', () => {
    const result = describeVisibility(5)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns clear/excellent for high visibility (20 km)', () => {
    const result = describeVisibility(20)
    expect(result.toLowerCase()).toMatch(/clear|excellent|good/)
  })

  it('returns crystal clear for exceptional visibility (50 km)', () => {
    const result = describeVisibility(50)
    expect(result.toLowerCase()).toMatch(/clear|excellent|exceptional/)
  })
})

// ─── describeAQI ─────────────────────────────────────────────────────────────

describe('describeAQI', () => {
  it('returns Good label for AQI 30', () => {
    const result = describeAQI(30)
    expect(result.label).toBe('Good')
    expect(result.color).toBeTruthy()
    expect(result.advice).toBeTruthy()
  })

  it('returns Moderate label for AQI 80', () => {
    const result = describeAQI(80)
    expect(result.label).toBe('Moderate')
  })

  it('returns Unhealthy for Sensitive Groups for AQI 120', () => {
    const result = describeAQI(120)
    expect(result.label).toMatch(/Unhealthy/)
  })

  it('returns Unhealthy label for AQI 175', () => {
    const result = describeAQI(175)
    expect(result.label).toBe('Unhealthy')
  })

  it('returns Very Unhealthy for AQI 225', () => {
    const result = describeAQI(225)
    expect(result.label).toBe('Very Unhealthy')
  })

  it('returns Hazardous for AQI 350', () => {
    const result = describeAQI(350)
    expect(result.label).toBe('Hazardous')
  })

  it('returns a hex color string', () => {
    const result = describeAQI(50)
    expect(result.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })
})

// ─── describePollenLevel ─────────────────────────────────────────────────────

describe('describePollenLevel', () => {
  it('returns None for null count', () => {
    expect(describePollenLevel(null)).toBe('None')
  })

  it('returns None for zero count', () => {
    expect(describePollenLevel(0)).toBe('None')
  })

  it('returns Low for low count (5)', () => {
    expect(describePollenLevel(5)).toBe('Low')
  })

  it('returns Moderate for moderate count (30)', () => {
    expect(describePollenLevel(30)).toBe('Moderate')
  })

  it('returns High for high count (80)', () => {
    expect(describePollenLevel(80)).toBe('High')
  })

  it('returns Very High for very high count (200)', () => {
    expect(describePollenLevel(200)).toBe('Very High')
  })
})
