import React from 'react'
import renderer, { act } from 'react-test-renderer'
import DailyBriefCard from './DailyBriefCard'

const current = {
  temperature: 22, apparentTemperature: 21, humidity: 55,
  precipitationProbability: 10, weatherCode: 1, windSpeed: 12,
  windDirection: 180, windGusts: 20, pressure: 1013,
  visibility: 10, uvIndex: 3, cloudCover: 15,
}

const hourly = {
  time: Array.from({ length: 24 }, (_, i) => `2026-04-25T${String(i).padStart(2,'0')}:00`),
  temperature: Array(24).fill(22),
  apparentTemperature: Array(24).fill(21),
  precipitationProbability: Array(24).fill(10),
  precipitation: Array(24).fill(0),
  weatherCode: Array(24).fill(1),
  windSpeed: Array(24).fill(12),
  windGusts: Array(24).fill(20),
  uvIndex: Array(24).fill(3),
  cloudCover: Array(24).fill(15),
  visibility: Array(24).fill(10),
  humidity: Array(24).fill(55),
}

describe('DailyBriefCard', () => {
  it('renders a brief summary string', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<DailyBriefCard current={current} hourly={hourly} />)
    })
    expect(tree.toJSON()).not.toBeNull()
  })
})
