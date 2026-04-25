import React from 'react'
import renderer, { act } from 'react-test-renderer'
import AIChatSheet from './AIChatSheet'
import { usePremiumStore } from '@/src/store/premiumStore'
import type { WeatherContext } from '@/src/api/openai'

const hourly = {
  time: ['2026-01-01T00:00', '2026-01-01T01:00'],
  temperature: [20, 21],
  apparentTemperature: [19, 20],
  precipitationProbability: [10, 15],
  precipitation: [0, 0],
  weatherCode: [0, 0],
  windSpeed: [10, 12],
  windGusts: [15, 18],
  uvIndex: [2, 3],
  cloudCover: [20, 25],
  visibility: [10, 10],
  humidity: [60, 62],
}

const daily = {
  time: ['2026-01-01'],
  tempMax: [25],
  tempMin: [15],
  weatherCode: [0],
  precipitationSum: [0],
  precipitationProbabilityMax: [10],
  windSpeedMax: [20],
  windGustsMax: [30],
  uvIndexMax: [4],
  sunrise: ['2026-01-01T06:00'],
  sunset: ['2026-01-01T18:00'],
}

const CTX: WeatherContext = {
  current: {
    temperature: 22,
    apparentTemperature: 21,
    humidity: 60,
    precipitationProbability: 10,
    weatherCode: 0,
    windSpeed: 12,
    windDirection: 180,
    windGusts: 18,
    pressure: 1013,
    visibility: 10,
    uvIndex: 3,
    cloudCover: 20,
  },
  hourly,
  daily,
  persona: 'athlete',
  unit: 'C',
}

afterEach(() => {
  usePremiumStore.setState({ isPremium: true, queriesUsedToday: 0 })
})

describe('AIChatSheet', () => {
  it('renders quick reply chips when no messages', async () => {
    await act(async () => {
      usePremiumStore.setState({ isPremium: true, queriesUsedToday: 0 })
    })
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<AIChatSheet weatherCtx={CTX} />)
    })
    const json = JSON.stringify(tree.toJSON())
    expect(json).toMatch(/AI Weather Assistant/)
    expect(json).toMatch(/Should I go for a run/)
  })

  it('shows query nudge when near limit', async () => {
    await act(async () => {
      usePremiumStore.setState({ isPremium: true, queriesUsedToday: 19 })
    })
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<AIChatSheet weatherCtx={CTX} />)
    })
    const json = JSON.stringify(tree.toJSON())
    expect(json).toMatch(/left today/)
  })
})
