import React from 'react'
import renderer, { act } from 'react-test-renderer'
import AQIGauge from './AQIGauge'

describe('AQIGauge', () => {
  it('renders AQI value', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<AQIGauge aqi={42} />)
    })
    expect(JSON.stringify(tree.toJSON())).toMatch(/42/)
  })

  it('renders for hazardous AQI', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<AQIGauge aqi={310} />)
    })
    expect(JSON.stringify(tree.toJSON())).toMatch(/310/)
  })
})
