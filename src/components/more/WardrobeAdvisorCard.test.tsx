import React from 'react'
import renderer, { act } from 'react-test-renderer'
import WardrobeAdvisorCard from './WardrobeAdvisorCard'
import { usePremiumStore } from '@/src/store/premiumStore'
import type { WeatherContext } from '@/src/api/openai'

const hourly = {
  time: ['2026-01-01T00:00'],
  temperature: [20],
  apparentTemperature: [19],
  precipitationProbability: [10],
  precipitation: [0],
  weatherCode: [0],
  windSpeed: [10],
  windGusts: [15],
  uvIndex: [2],
  cloudCover: [20],
  visibility: [10],
  humidity: [60],
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
    temperature: 22, apparentTemperature: 21, humidity: 60,
    precipitationProbability: 10, weatherCode: 0, windSpeed: 12,
    windDirection: 180, windGusts: 18, pressure: 1013,
    visibility: 10, uvIndex: 3, cloudCover: 20,
  },
  hourly, daily,
  persona: 'wellness',
  unit: 'C',
}

afterEach(() => {
  usePremiumStore.setState({ isPremium: true, queriesUsedToday: 0 })
})

describe('WardrobeAdvisorCard', () => {
  it('renders the ask button in initial state', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<WardrobeAdvisorCard weatherCtx={CTX} />)
    })
    const json = JSON.stringify(tree.toJSON())
    expect(json).toMatch(/Wardrobe Advisor/)
    expect(json).toMatch(/What should I wear/)
  })
})
