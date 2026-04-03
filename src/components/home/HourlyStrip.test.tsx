import React from 'react'
import TestRenderer from 'react-test-renderer'
import HourlyStrip from '@/src/components/home/HourlyStrip'
import type { DailyWeather, HourlyWeather } from '@/src/types/weather'

function mockHourly(): HourlyWeather {
  const times = ['2026-06-15T12:00:00', '2026-06-15T13:00:00', '2026-06-15T14:00:00']
  const n = times.length
  const z = (): number[] => Array(n).fill(0)
  return {
    time: times,
    temperature: [20, 21, 19],
    apparentTemperature: z(),
    precipitationProbability: [5, 10, 8],
    precipitation: z(),
    weatherCode: [0, 1, 2],
    windSpeed: z(),
    windGusts: z(),
    uvIndex: z(),
    cloudCover: z(),
    visibility: z(),
    humidity: z(),
  }
}

function mockDaily(): DailyWeather {
  return {
    time: ['2026-06-15'],
    tempMax: [22],
    tempMin: [12],
    weatherCode: [0],
    precipitationSum: [0],
    precipitationProbabilityMax: [10],
    windSpeedMax: [10],
    windGustsMax: [12],
    uvIndexMax: [5],
    sunrise: ['2026-06-15T06:00:00'],
    sunset: ['2026-06-15T20:00:00'],
  }
}

describe('HourlyStrip', () => {
  it('renders with hourly and daily data', () => {
    const tree = TestRenderer.create(
      <HourlyStrip hourly={mockHourly()} daily={mockDaily()} unit="C" />,
    )
    expect(tree.toJSON()).toBeTruthy()
    tree.unmount()
  })
})
