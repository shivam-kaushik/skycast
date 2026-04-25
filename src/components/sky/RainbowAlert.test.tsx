import React from 'react'
import renderer, { act } from 'react-test-renderer'
import RainbowAlert from './RainbowAlert'
import type { RainbowWindow } from '@/src/types/weather'

const WINDOW: RainbowWindow = {
  likelyAt: new Date('2026-04-25T17:30:00'),
  faceDirection: 'E',
}

describe('RainbowAlert', () => {
  it('renders rainbow alert when window exists', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<RainbowAlert window={WINDOW} />)
    })
    const json = JSON.stringify(tree.toJSON())
    expect(json).toMatch(/Rainbow/)
    expect(json).toMatch(/E/)
  })

  it('renders nothing when window is null', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<RainbowAlert window={null} />)
    })
    expect(tree.toJSON()).toBeNull()
  })
})
