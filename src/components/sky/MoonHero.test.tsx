import React from 'react'
import renderer, { act } from 'react-test-renderer'
import MoonHero from './MoonHero'
import type { LunarData } from '@/src/types/weather'

const LUNAR: LunarData = {
  phaseName: 'Full Moon',
  illumination: 0.98,
  phaseAngle: 180,
  rise: new Date('2026-04-25T20:00:00'),
  set: new Date('2026-04-26T06:00:00'),
  nextFullMoon: new Date('2026-05-23T12:00:00'),
  nextNewMoon: new Date('2026-05-08T08:00:00'),
}

describe('MoonHero', () => {
  it('renders phase name and illumination', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<MoonHero lunar={LUNAR} />)
    })
    const json = JSON.stringify(tree.toJSON())
    expect(json).toMatch(/Full Moon/)
    expect(json).toMatch(/98/)
    expect(json).toMatch(/illuminated/)
  })

  it('renders without rise/set times when null', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<MoonHero lunar={{ ...LUNAR, rise: null, set: null }} />)
    })
    expect(tree.toJSON()).not.toBeNull()
  })
})
