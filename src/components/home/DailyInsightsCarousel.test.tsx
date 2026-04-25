import React from 'react'
import renderer, { act } from 'react-test-renderer'
import DailyInsightsCarousel from './DailyInsightsCarousel'

const TODAY = '2026-04-25'
const TIMES = Array.from({ length: 24 }, (_, h) => `${TODAY}T${h.toString().padStart(2, '0')}:00`)

const HOURLY = {
  time: TIMES,
  temperature: TIMES.map(() => 20),
  apparentTemperature: TIMES.map(() => 20),
  precipitationProbability: TIMES.map((_, i) => (i === 14 ? 65 : 5)),
  precipitation: TIMES.map(() => 0),
  weatherCode: TIMES.map(() => 1),
  windSpeed: TIMES.map(() => 18),
  windGusts: TIMES.map(() => 28),
  uvIndex: TIMES.map((_, i) => (i === 13 ? 7 : 2)),
  cloudCover: TIMES.map(() => 30),
  visibility: TIMES.map(() => 10),
  humidity: TIMES.map(() => 55),
}

const DAILY = {
  time: [TODAY],
  tempMax: [26],
  tempMin: [14],
  weatherCode: [1],
  precipitationSum: [0],
  precipitationProbabilityMax: [65],
  windSpeedMax: [22],
  windGustsMax: [32],
  uvIndexMax: [7],
  sunrise: [`${TODAY}T06:00`],
  sunset: [`${TODAY}T20:00`],
}

describe('DailyInsightsCarousel', () => {
  it('renders without crashing', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(
        <DailyInsightsCarousel hourly={HOURLY} daily={DAILY} unit="C" today={TODAY} />,
      )
    })
    expect(tree.toJSON()).not.toBeNull()
  })

  it('shows DAILY ANALYTICS label', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(
        <DailyInsightsCarousel hourly={HOURLY} daily={DAILY} unit="C" today={TODAY} />,
      )
    })
    expect(JSON.stringify(tree.toJSON())).toMatch(/DAILY ANALYTICS/)
  })

  it('shows rain percentage', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(
        <DailyInsightsCarousel hourly={HOURLY} daily={DAILY} unit="C" today={TODAY} />,
      )
    })
    expect(JSON.stringify(tree.toJSON())).toMatch(/65/)
  })

  it('shows UV value', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(
        <DailyInsightsCarousel hourly={HOURLY} daily={DAILY} unit="C" today={TODAY} />,
      )
    })
    expect(JSON.stringify(tree.toJSON())).toMatch(/UV/)
  })
})
