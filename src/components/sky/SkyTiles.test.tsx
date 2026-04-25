import React from 'react'
import renderer, { act } from 'react-test-renderer'
import SkyTiles from './SkyTiles'
import type { SkyPhenomena, LunarData } from '@/src/types/weather'

const PHENOMENA: SkyPhenomena = {
  stargazingScore: 8,
  sunsetScore: 7,
  goldenHourStart: new Date('2026-04-25T18:30:00'),
  goldenHourEnd: new Date('2026-04-25T19:00:00'),
  goldenHourQuality: 'Good',
  rainbowWindow: null,
}

const LUNAR: LunarData = {
  phaseName: 'Waxing Gibbous',
  illumination: 0.75,
  phaseAngle: 135,
  rise: new Date('2026-04-25T15:00:00'),
  set: new Date('2026-04-26T02:00:00'),
  nextFullMoon: new Date('2026-05-23T12:00:00'),
  nextNewMoon: new Date('2026-05-08T08:00:00'),
}

describe('SkyTiles', () => {
  it('renders stargazing score and golden hour', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<SkyTiles phenomena={PHENOMENA} lunar={LUNAR} />)
    })
    const json = JSON.stringify(tree.toJSON())
    expect(json).toMatch(/8/)
    expect(json).toMatch(/Good/)
  })
})
