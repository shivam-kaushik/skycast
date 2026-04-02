import React from 'react'
import TestRenderer from 'react-test-renderer'
import WeatherAmbientBackground from '@/src/components/home/WeatherAmbientBackground'

describe('WeatherAmbientBackground', () => {
  it('renders for rain and clear states', () => {
    const a = TestRenderer.create(
      <WeatherAmbientBackground
        weatherCode={65}
        isDay
        precipitationProbability={80}
        hourlyPrecipitationMax={70}
      />,
    )
    expect(a.toJSON()).toBeTruthy()
    a.unmount()
    const b = TestRenderer.create(
      <WeatherAmbientBackground
        weatherCode={0}
        isDay={false}
        precipitationProbability={0}
        hourlyPrecipitationMax={0}
      />,
    )
    expect(b.toJSON()).toBeTruthy()
    b.unmount()
  })
})
