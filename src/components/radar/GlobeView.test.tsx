import React from 'react'
import renderer, { act } from 'react-test-renderer'
import GlobeView from './GlobeView'

const WEATHER = {
  temperature: 22,
  precipitationProbability: 15,
  windSpeed: 12,
  windDirection: 270,
  usAqi: 35,
  conditionLabel: 'Partly Cloudy',
}

describe('GlobeView', () => {
  it('renders without crashing', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(
        <GlobeView lat={51.5} lon={-0.1} layer="precipitation" weather={WEATHER} />,
      )
    })
    expect(tree.toJSON()).not.toBeNull()
  })
})
