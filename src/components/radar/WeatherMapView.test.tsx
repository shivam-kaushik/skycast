import React from 'react'
import renderer, { act } from 'react-test-renderer'
import WeatherMapView from './WeatherMapView'

jest.mock('@/src/hooks/useOmeteoMapTileMetadata', () => ({
  useOmeteoMapTileMetadata: () => ({ data: null, isLoading: false }),
}))

const WEATHER = {
  current: {
    temperature: 22, apparentTemperature: 21, humidity: 60,
    precipitationProbability: 20, weatherCode: 1, windSpeed: 15,
    windDirection: 270, windGusts: 25, pressure: 1015,
    visibility: 12, uvIndex: 5, cloudCover: 30,
  },
  hourly: {
    time: [], temperature: [], apparentTemperature: [],
    precipitationProbability: [], precipitation: [], weatherCode: [],
    windSpeed: [], windGusts: [], uvIndex: [], cloudCover: [],
    visibility: [], humidity: [],
  },
  daily: {
    time: [], tempMax: [], tempMin: [], weatherCode: [],
    precipitationSum: [], precipitationProbabilityMax: [],
    windSpeedMax: [], windGustsMax: [], uvIndexMax: [],
    sunrise: [], sunset: [],
  },
}

describe('WeatherMapView', () => {
  it('renders without crashing', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(
        <WeatherMapView
          lat={51.5}
          lon={-0.1}
          layer="precipitation"
          weather={WEATHER}
          airQuality={undefined}
          frameIndex={0}
          onFrameCountChange={() => {}}
          onLoadingChange={() => {}}
        />,
      )
    })
    expect(tree.toJSON()).not.toBeNull()
  })
})
