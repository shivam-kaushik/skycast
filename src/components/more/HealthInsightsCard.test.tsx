import React from 'react'
import renderer, { act } from 'react-test-renderer'
import HealthInsightsCard from './HealthInsightsCard'

describe('HealthInsightsCard', () => {
  it('renders each insight line', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<HealthInsightsCard lines={['First tip.', 'Second tip.']} />)
    })
    expect(JSON.stringify(tree.toJSON())).toMatch(/First tip/)
    expect(JSON.stringify(tree.toJSON())).toMatch(/Second tip/)
  })
})
