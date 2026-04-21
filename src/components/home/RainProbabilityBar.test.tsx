import React from 'react'
import { act } from 'react-test-renderer'
import renderer from 'react-test-renderer'
import RainProbabilityBar from './RainProbabilityBar'
import type { HourlyWeather } from '@/src/types/weather'

function makeHourly(prob: number): HourlyWeather {
  const n = 48
  const time = Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.now() + i * 3600_000)
    return d.toISOString().slice(0, 16)
  })
  return {
    time,
    temperature: Array(n).fill(20),
    apparentTemperature: Array(n).fill(19),
    precipitationProbability: Array(n).fill(prob),
    precipitation: Array(n).fill(0),
    weatherCode: Array(n).fill(1),
    windSpeed: Array(n).fill(10),
    windGusts: Array(n).fill(12),
    uvIndex: Array(n).fill(3),
    cloudCover: Array(n).fill(10),
    visibility: Array(n).fill(20),
    humidity: Array(n).fill(50),
    surfacePressure: Array(n).fill(1013),
  }
}

describe('RainProbabilityBar', () => {
  it('renders null when peak < 10%', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<RainProbabilityBar hourly={makeHourly(5)} />)
    })
    expect(tree.toJSON()).toBeNull()
  })

  it('renders bar when peak >= 10%', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<RainProbabilityBar hourly={makeHourly(60)} />)
    })
    const json = JSON.stringify(tree.toJSON())
    expect(json).toMatch(/Peak/)
    expect(json).toMatch(/60/)
  })
})
