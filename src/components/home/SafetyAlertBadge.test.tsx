import React from 'react'
import renderer, { act } from 'react-test-renderer'
import SafetyAlertBadge from './SafetyAlertBadge'
import type { WeatherAlert } from '@/src/types/weather'

const ALERT: WeatherAlert = {
  id: 'a1',
  title: 'Thunderstorm Warning',
  description: 'Severe thunderstorms expected this afternoon.',
  severity: 'extreme',
  source: 'nws',
  geometry: null,
}

describe('SafetyAlertBadge', () => {
  it('renders alert headline', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<SafetyAlertBadge alerts={[ALERT]} />)
    })
    expect(JSON.stringify(tree.toJSON())).toMatch(/Thunderstorm/)
  })

  it('renders nothing when alerts array is empty', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<SafetyAlertBadge alerts={[]} />)
    })
    expect(tree.toJSON()).toBeNull()
  })
})
