import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import WeatherAmbientBackground from '@/src/components/home/WeatherAmbientBackground'

describe('WeatherAmbientBackground', () => {
  it('renders for rain and clear states', async () => {
    let a!: TestRenderer.ReactTestRenderer
    await act(async () => {
      a = TestRenderer.create(
        <WeatherAmbientBackground
          weatherCode={65}
          isDay
          precipitationProbability={80}
          hourlyPrecipitationMax={70}
        />,
      )
    })
    expect(a.toJSON()).toBeTruthy()
    await act(async () => { a.unmount() })

    let b!: TestRenderer.ReactTestRenderer
    await act(async () => {
      b = TestRenderer.create(
        <WeatherAmbientBackground
          weatherCode={0}
          isDay={false}
          precipitationProbability={0}
          hourlyPrecipitationMax={0}
        />,
      )
    })
    expect(b.toJSON()).toBeTruthy()
    await act(async () => { b.unmount() })
  })
})
