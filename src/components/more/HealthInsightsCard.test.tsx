import React from 'react'
import renderer from 'react-test-renderer'
import HealthInsightsCard from './HealthInsightsCard'

describe('HealthInsightsCard', () => {
  it('renders each insight line', () => {
    const tree = renderer.create(
      <HealthInsightsCard lines={['First tip.', 'Second tip.']} />,
    ).toJSON()
    expect(JSON.stringify(tree)).toMatch(/First tip/)
    expect(JSON.stringify(tree)).toMatch(/Second tip/)
  })
})
