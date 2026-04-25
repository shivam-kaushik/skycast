import React from 'react'
import renderer, { act } from 'react-test-renderer'
import PollenTrendChart from './PollenTrendChart'

const hourly = {
  time: Array.from({ length: 24 }, (_, i) => `2026-04-25T${String(i).padStart(2, '0')}:00`),
  pm10: Array(24).fill(10),
  pm25: Array(24).fill(5),
  no2: Array(24).fill(20),
  ozone: Array(24).fill(60),
  alderPollen: Array(24).fill(5),
  birchPollen: Array(24).fill(12),
  grassPollen: Array(24).fill(80),
  mugwortPollen: Array(24).fill(2),
  olivePollen: Array(24).fill(0),
  ragweedPollen: Array(24).fill(3),
}

describe('PollenTrendChart', () => {
  it('renders pollen chart for all allergens', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<PollenTrendChart hourly={hourly} startIdx={0} />)
    })
    expect(tree.toJSON()).not.toBeNull()
  })
})
