import React from 'react'
import renderer, { act } from 'react-test-renderer'
import HistoryBriefCard from './HistoryBriefCard'

const BRIEF = {
  lines: ['Last week averaged 24°C highs.', 'This week looks warmer than normal.'],
  anomaly: 'warmer' as const,
}

describe('HistoryBriefCard', () => {
  it('renders loading state', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<HistoryBriefCard isLoading={true} errorMessage={null} brief={null} />)
    })
    expect(tree.toJSON()).not.toBeNull()
  })

  it('renders brief lines when loaded', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<HistoryBriefCard isLoading={false} errorMessage={null} brief={BRIEF} />)
    })
    expect(JSON.stringify(tree.toJSON())).toMatch(/Last week/)
  })

  it('renders error message', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<HistoryBriefCard isLoading={false} errorMessage="Could not load history." brief={null} />)
    })
    expect(JSON.stringify(tree.toJSON())).toMatch(/Could not load/)
  })
})
