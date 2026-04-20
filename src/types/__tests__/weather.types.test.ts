import type { HourlyWeather, LunarData, SkyPhenomena, RainSegment, PressureAlertData, AllergyRiskData, WeatherAlert } from '@/src/types/weather'

describe('weather type extensions', () => {
  it('HourlyWeather has surfacePressure', () => {
    const h: HourlyWeather = {
      time: [],
      temperature: [],
      apparentTemperature: [],
      precipitationProbability: [],
      precipitation: [],
      weatherCode: [],
      windSpeed: [],
      windGusts: [],
      uvIndex: [],
      cloudCover: [],
      visibility: [],
      humidity: [],
      surfacePressure: [],
    }
    expect(h.surfacePressure).toBeDefined()
  })

  it('LunarData shape is correct', () => {
    const l: LunarData = {
      phaseName: 'Full Moon',
      illumination: 1,
      phaseAngle: 0.5,
      rise: new Date(),
      set: null,
      nextFullMoon: new Date(),
      nextNewMoon: new Date(),
    }
    expect(l.phaseName).toBe('Full Moon')
  })

  it('SkyPhenomena shape is correct', () => {
    const s: SkyPhenomena = {
      stargazingScore: 7,
      sunsetScore: 8,
      goldenHourStart: new Date(),
      goldenHourEnd: new Date(),
      goldenHourQuality: 'Good',
      rainbowWindow: null,
    }
    expect(s.stargazingScore).toBe(7)
  })

  it('WeatherAlert shape is correct', () => {
    const a: WeatherAlert = {
      id: 'x',
      title: 'T',
      description: 'D',
      severity: 'severe',
      source: 'nws',
      geometry: null,
    }
    expect(a.source).toBe('nws')
  })
})
