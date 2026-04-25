import React from 'react'
import renderer, { act } from 'react-test-renderer'
import AIFeaturesCard from './AIFeaturesCard'

describe('AIFeaturesCard', () => {
  it('renders phases and notifications', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(
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
    })

    const json = JSON.stringify(tree.toJSON())
    expect(json).toMatch(/AI planner and alerts/)
    expect(json).toMatch(/Running window/)
    expect(json).toMatch(/Rain risk/)
  })
})
