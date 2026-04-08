import React from 'react'
import renderer from 'react-test-renderer'
import AIFeaturesCard from './AIFeaturesCard'

describe('AIFeaturesCard', () => {
  it('renders phases and notifications', () => {
    const tree = renderer
      .create(
        <AIFeaturesCard
          phase1={[
            {
              id: 'a',
              phase: 'phase1',
              kind: 'activity',
              title: 'Running window',
              message: 'Best 7 AM-10 AM',
              confidence: 0.8,
            },
          ]}
          phase2={[]}
          phase3={[]}
          notifications={[
            {
              id: 'n1',
              type: 'rain',
              title: 'Rain risk',
              body: 'Carry umbrella',
              triggerAtIso: new Date().toISOString(),
              priority: 'actionable',
            },
          ]}
        />,
      )
      .toJSON()

    expect(JSON.stringify(tree)).toMatch(/AI planner and alerts/)
    expect(JSON.stringify(tree)).toMatch(/Running window/)
    expect(JSON.stringify(tree)).toMatch(/Rain risk/)
  })
})
