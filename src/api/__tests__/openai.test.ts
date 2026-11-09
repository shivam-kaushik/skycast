import {
  buildWeatherContext,
  getTripBriefing,
  getWardrobeAdvice,
  routeModel,
  streamChat,
  type WeatherContext,
} from '@/src/api/openai'
import type { AirQualityData } from '@/src/types/weather'

const mockCreate = jest.fn()

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: (...args: unknown[]) => mockCreate(...args) } },
  })),
}))

function airQuality(overrides: Partial<AirQualityData['hourly']> = {}, usAqi = 55): AirQualityData {
  return {
    current: { pm10: 0, pm25: 0, co: 0, no2: 0, ozone: 0, so2: 0, usAqi, europeanAqi: 0 },
    hourly: {
      time: [], pm10: [], pm25: [], no2: [], ozone: [],
      alderPollen: [], birchPollen: [], grassPollen: [], mugwortPollen: [], olivePollen: [], ragweedPollen: [],
      ...overrides,
    },
  }
}

function context(overrides: Partial<WeatherContext> = {}): WeatherContext {
  const zeros = Array.from({ length: 48 }, () => 0)
  return {
    current: {
      temperature: 20, apparentTemperature: 20, humidity: 65, precipitationProbability: 0,
      weatherCode: 0, windSpeed: 12.4, windDirection: 0, windGusts: 0, pressure: 1013.6,
      visibility: 10, uvIndex: 5.25, cloudCover: 0,
    },
    hourly: {
      time: [], temperature: [], apparentTemperature: [], precipitationProbability: zeros,
      precipitation: [], weatherCode: [], windSpeed: [], windGusts: [], uvIndex: [],
      cloudCover: [], visibility: [], humidity: [],
    },
    daily: {
      time: [], tempMax: [], tempMin: [], weatherCode: [], precipitationSum: [],
      precipitationProbabilityMax: [], windSpeedMax: [], windGustsMax: [], uvIndexMax: [],
      sunrise: [], sunset: [],
    },
    persona: 'athlete',
    unit: 'C',
    ...overrides,
  }
}

async function* chunks(...deltas: Array<string | undefined | null>) {
  for (const content of deltas) yield { choices: [{ delta: { content } }] }
}

describe('routeModel', () => {
  it('uses the larger model only for trip briefings', () => {
    expect(routeModel('trip')).toBe('gpt-4o')
    expect(routeModel('chat')).toBe('gpt-4o-mini')
    expect(routeModel('wardrobe')).toBe('gpt-4o-mini')
  })
})

describe('buildWeatherContext', () => {
  it('summarizes current conditions in Celsius', () => {
    const text = buildWeatherContext(context())
    expect(text).toContain('Persona: athlete')
    expect(text).toContain('Current: 20°C, 65% humidity, wind 12 km/h, UV 5.3, pressure 1014 hPa')
  })

  it('converts the temperature for Fahrenheit users', () => {
    const text = buildWeatherContext(context({ unit: 'F' }))
    expect(text).toContain('Current: 68°F')
  })

  it('reports unknown pollen and AQI without air-quality data', () => {
    const text = buildWeatherContext(context())
    expect(text).toContain('Pollen (peak 24h): Unknown')
    expect(text).toContain('AQI: unknown')
  })

  it('classifies the peak pollen across grass, birch and ragweed in the next 24h', () => {
    const text = buildWeatherContext(
      context({ airQuality: airQuality({ grassPollen: [5, 30], birchPollen: [null, 8], ragweedPollen: [2] }, 72) }),
    )
    expect(text).toContain('Pollen (peak 24h): Moderate')
    expect(text).toContain('AQI: 72')
  })

  it('ignores pollen readings beyond the first 24 hours', () => {
    const grass = [...Array.from({ length: 24 }, () => 1), 500]
    const text = buildWeatherContext(context({ airQuality: airQuality({ grassPollen: grass }) }))
    expect(text).toContain('Pollen (peak 24h): Low')
  })

  it('counts hours with at least 50% rain chance in the next 48h only', () => {
    const probabilities = Array.from({ length: 60 }, (_, i) => (i < 3 ? 50 : i === 10 ? 49 : i >= 48 ? 100 : 0))
    const ctx = context()
    ctx.hourly.precipitationProbability = probabilities
    expect(buildWeatherContext(ctx)).toContain('Rain risk (next 48h): 3 hours with ≥50% chance')
  })

  it('includes the user schedule only when a routine is set', () => {
    expect(buildWeatherContext(context())).not.toContain('User schedule')
    const text = buildWeatherContext(
      context({ routine: { morningStartHour: 6, commuteStartHour: 8, commuteEndHour: 9, eveningOutdoorHour: 18 } }),
    )
    expect(text).toContain('User schedule: active from 6:00, commute 8–9, outdoor evening 18:00')
  })
})

describe('streamChat', () => {
  beforeEach(() => mockCreate.mockReset())

  it('requests a streamed completion with the system context ahead of the conversation', async () => {
    mockCreate.mockResolvedValue(chunks())
    const messages = [{ role: 'user' as const, content: 'Umbrella?' }]

    await streamChat(messages, 'CTX', 'gpt-4o-mini', () => {})

    const request = mockCreate.mock.calls[0]?.[0]
    expect(request).toMatchObject({ model: 'gpt-4o-mini', stream: true, max_tokens: 300 })
    expect(request.messages[0].role).toBe('system')
    expect(request.messages[0].content).toContain('Skycast AI')
    expect(request.messages[0].content).toContain('Weather context:\nCTX')
    expect(request.messages.slice(1)).toEqual(messages)
  })

  it('emits each non-empty token in order and ignores empty or missing deltas', async () => {
    mockCreate.mockResolvedValue(chunks('Take', '', ' an', undefined, null, ' umbrella'))
    const onToken = jest.fn()

    await streamChat([], 'CTX', 'gpt-4o-mini', onToken)

    expect(onToken.mock.calls.map((c) => c[0])).toEqual(['Take', ' an', ' umbrella'])
  })

  it('propagates API errors', async () => {
    mockCreate.mockRejectedValue(new Error('quota'))

    await expect(streamChat([], 'CTX', 'gpt-4o', () => {})).rejects.toThrow('quota')
  })
})

describe('getWardrobeAdvice', () => {
  beforeEach(() => mockCreate.mockReset())

  const reply = (content: string | null | undefined) => ({ choices: [{ message: { content } }] })

  it('asks for a JSON object from the small model', async () => {
    mockCreate.mockResolvedValue(reply('{}'))

    await getWardrobeAdvice('CTX')

    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      max_tokens: 250,
    })
  })

  it('returns the parsed advice', async () => {
    const advice = { top: 'Rain jacket', bottom: 'Jeans', footwear: 'Boots', accessories: ['Umbrella'], notes: 'Wet' }
    mockCreate.mockResolvedValue(reply(JSON.stringify(advice)))

    await expect(getWardrobeAdvice('CTX')).resolves.toEqual(advice)
  })

  it.each([['{}'], [null], [undefined]])('fills empty defaults for missing fields (content: %p)', async (content) => {
    mockCreate.mockResolvedValue(reply(content))

    await expect(getWardrobeAdvice('CTX')).resolves.toEqual({
      top: '', bottom: '', footwear: '', accessories: [], notes: '',
    })
  })

  it('rejects when the model returns invalid JSON', async () => {
    mockCreate.mockResolvedValue(reply('not json'))

    await expect(getWardrobeAdvice('CTX')).rejects.toThrow(SyntaxError)
  })
})

describe('getTripBriefing', () => {
  beforeEach(() => mockCreate.mockReset())

  it('uses the larger model and names the destination and dates in the prompt', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'Pack layers.' } }] })

    const briefing = await getTripBriefing('Lisbon', '2026-10-01', '2026-10-05', 'CTX')

    const request = mockCreate.mock.calls[0]?.[0]
    expect(request).toMatchObject({ model: 'gpt-4o', max_tokens: 400 })
    expect(request.messages[0].content).toContain('Current location context:\nCTX')
    expect(request.messages[1].content).toContain('Lisbon from 2026-10-01 to 2026-10-05')
    expect(briefing).toBe('Pack layers.')
  })

  it('returns an empty string when the model sends no content', async () => {
    mockCreate.mockResolvedValue({ choices: [] })

    await expect(getTripBriefing('X', 'a', 'b', 'CTX')).resolves.toBe('')
  })
})
