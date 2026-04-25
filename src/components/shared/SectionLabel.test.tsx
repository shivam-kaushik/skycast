import React from 'react'
import renderer, { act } from 'react-test-renderer'
import SectionLabel from './SectionLabel'

describe('SectionLabel', () => {
  it('renders uppercased text', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<SectionLabel text="Hourly Forecast" />)
    })
    expect(JSON.stringify(tree.toJSON())).toMatch(/HOURLY FORECAST/)
  })

  it('renders with accent style', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<SectionLabel text="AI Features" accent />)
    })
    expect(JSON.stringify(tree.toJSON())).toMatch(/AI FEATURES/)
  })
})
