import React from 'react'
import renderer, { act } from 'react-test-renderer'
import PollutantList from './PollutantList'

const current = {
  pm10: 18, pm25: 9, co: 400, no2: 22, ozone: 55, so2: 4,
  usAqi: 35, europeanAqi: 28,
}

describe('PollutantList', () => {
  it('renders pollutant labels', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<PollutantList current={current} />)
    })
    const json = JSON.stringify(tree.toJSON())
    expect(json).toMatch(/PM2\.5/)
    expect(json).toMatch(/PM10/)
    expect(json).toMatch(/NO₂|NO/)
  })
})
