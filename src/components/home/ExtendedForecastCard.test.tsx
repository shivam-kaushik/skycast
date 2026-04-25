import React from 'react'
import renderer, { act } from 'react-test-renderer'
import ExtendedForecastCard from './ExtendedForecastCard'

const daily = {
  time: Array.from({ length: 16 }, (_, i) => {
    const d = new Date('2026-04-25')
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  }),
  tempMax: Array(16).fill(25),
  tempMin: Array(16).fill(15),
  weatherCode: Array(16).fill(0),
  precipitationSum: Array(16).fill(0),
  precipitationProbabilityMax: Array(16).fill(10),
  windSpeedMax: Array(16).fill(20),
  windGustsMax: Array(16).fill(30),
  uvIndexMax: Array(16).fill(4),
  sunrise: Array(16).fill('2026-04-25T06:00'),
  sunset: Array(16).fill('2026-04-25T19:00'),
}

describe('ExtendedForecastCard', () => {
  it('renders days 8-16 of the forecast', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<ExtendedForecastCard daily={daily} unit="C" />)
    })
    const json = JSON.stringify(tree.toJSON())
    expect(json).toMatch(/Extended Forecast/)
    expect(json).toMatch(/Premium/)
  })

  it('returns null when fewer than 8 days of data', async () => {
    const shortDaily = { ...daily, time: daily.time.slice(0, 7) }
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<ExtendedForecastCard daily={shortDaily} unit="C" />)
    })
    expect(tree.toJSON()).toBeNull()
  })
})
