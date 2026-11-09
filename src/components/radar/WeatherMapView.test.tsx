import React from 'react'
import renderer, { act } from 'react-test-renderer'
import WeatherMapView, { type WeatherMapHandle } from './WeatherMapView'

const mockTileMeta = {
  tileSourceUrl: 'https://openmeteo.s3.amazonaws.com/data_spatial/ecmwf_ifs/latest.json?variable=precipitation',
  tileValidTimesLength: 48,
  validTimes: Array.from({ length: 48 }, (_, i) => `2026-09-20T${String(i % 24).padStart(2, '0')}:00Z`),
  referenceTime: '2026-09-20T00:00Z',
  cloudSourceUrl: 'https://openmeteo.s3.amazonaws.com/data_spatial/ecmwf_ifs/latest.json?variable=cloud_cover',
  cloudValidTimesLength: 48,
  cloudValidTimes: Array.from({ length: 48 }, (_, i) => `2026-09-20T${String(i % 24).padStart(2, '0')}:00Z`),
  cloudReferenceTime: '2026-09-20T00:00Z',
}

jest.mock('@/src/hooks/useOmeteoMapTileMetadata', () => ({
  useOmeteoMapTileMetadata: jest.fn(() => ({
    data: mockTileMeta,
    isLoading: false,
    isError: false,
  })),
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
  it('renders without crashing once tile metadata resolves', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(
        <WeatherMapView
          lat={51.5}
          lon={-0.1}
          layer="precipitation"
          weather={WEATHER}
          airQuality={undefined}
          onFrameUpdate={() => {}}
          onTimelineReady={() => {}}
        />,
      )
    })
    expect(tree.toJSON()).not.toBeNull()
  })

  it('forwards play/pause/seekToFrame to the WebView via injectJavaScript', async () => {
    const { mockInjectJavaScript } = require('react-native-webview')
    mockInjectJavaScript.mockClear()

    const ref = React.createRef<WeatherMapHandle>()
    await act(async () => {
      renderer.create(
        <WeatherMapView
          ref={ref}
          lat={51.5}
          lon={-0.1}
          layer="precipitation"
          weather={WEATHER}
          airQuality={undefined}
          onFrameUpdate={() => {}}
          onTimelineReady={() => {}}
        />,
      )
    })

    act(() => ref.current?.play())
    expect(mockInjectJavaScript).toHaveBeenCalledWith(expect.stringContaining('"type":"play"'))

    act(() => ref.current?.pause())
    expect(mockInjectJavaScript).toHaveBeenCalledWith(expect.stringContaining('"type":"pause"'))

    act(() => ref.current?.seekToFrame(2))
    expect(mockInjectJavaScript).toHaveBeenCalledWith(expect.stringContaining('seek'))
    expect(mockInjectJavaScript).toHaveBeenCalledWith(expect.stringContaining('index'))
  })
})
