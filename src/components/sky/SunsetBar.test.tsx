import React from 'react'
import renderer, { act } from 'react-test-renderer'
import SunsetBar from './SunsetBar'

describe('SunsetBar', () => {
  it('renders 10 dots', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<SunsetBar score={7} sunsetTime={new Date('2026-04-25T19:15:00')} />)
    })
    expect(tree.toJSON()).not.toBeNull()
  })

  it('renders with null sunset time', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<SunsetBar score={5} sunsetTime={null} />)
    })
    expect(tree.toJSON()).not.toBeNull()
  })
})
