import React from 'react'
import renderer, { act } from 'react-test-renderer'
import MetricTilesGrid from './MetricTilesGrid'

const current = {
  temperature: 22, apparentTemperature: 21, humidity: 60,
  precipitationProbability: 20, weatherCode: 1, windSpeed: 15,
  windDirection: 270, windGusts: 25, pressure: 1015,
  visibility: 12, uvIndex: 5, cloudCover: 30,
}

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))

describe('MetricTilesGrid', () => {
  it('renders wind speed and humidity tiles', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<MetricTilesGrid current={current} />)
    })
    const json = JSON.stringify(tree.toJSON())
    expect(json).toMatch(/Wind/)
    expect(json).toMatch(/60/)
  })
})
