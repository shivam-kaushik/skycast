import React from 'react'
import renderer, { act } from 'react-test-renderer'
import RadarLegend from './RadarLegend'

describe('RadarLegend', () => {
  it('renders precipitation legend', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<RadarLegend layer="precipitation" />)
    })
    expect(tree.toJSON()).not.toBeNull()
  })

  it('renders wind legend', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<RadarLegend layer="wind" />)
    })
    expect(tree.toJSON()).not.toBeNull()
  })
})
