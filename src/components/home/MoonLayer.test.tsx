import React from 'react'
import renderer, { act } from 'react-test-renderer'
import MoonLayer from './MoonLayer'

describe('MoonLayer', () => {
  it('renders moon disc', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<MoonLayer />)
    })
    expect(tree.toJSON()).not.toBeNull()
  })
})
