import React from 'react'
import renderer, { act } from 'react-test-renderer'
import HorizonGlowLayer from './HorizonGlowLayer'

describe('HorizonGlowLayer', () => {
  it('renders dawn variant', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<HorizonGlowLayer variant="dawn" />)
    })
    expect(tree.toJSON()).not.toBeNull()
  })

  it('renders dusk variant', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<HorizonGlowLayer variant="dusk" />)
    })
    expect(tree.toJSON()).not.toBeNull()
  })
})
