import React from 'react'
import renderer, { act } from 'react-test-renderer'
import ActivityScoreRow from './ActivityScoreRow'

const SCORE = { score: 8.5, label: 'Excellent' as const, reason: 'Perfect conditions', color: '#06D6A0' }

describe('ActivityScoreRow', () => {
  it('renders activity name and score', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<ActivityScoreRow name="Running" icon="walk-outline" score={SCORE} />)
    })
    const json = JSON.stringify(tree.toJSON())
    expect(json).toMatch(/Running/)
    expect(json).toMatch(/8\.5/)
  })

  it('renders poor score label', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(
        <ActivityScoreRow name="Cycling" icon="bicycle-outline" score={{ score: 2, label: 'Poor', reason: 'Too windy', color: '#FF6B6B' }} />,
      )
    })
    expect(JSON.stringify(tree.toJSON())).toMatch(/Poor/)
  })
})
