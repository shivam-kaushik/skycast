import React from 'react'
import renderer, { act } from 'react-test-renderer'
import AlertDetailSheet from './AlertDetailSheet'
import type { WeatherAlert } from '@/src/types/weather'

const ALERTS: WeatherAlert[] = [
  {
    id: 'a1',
    title: 'Thunderstorm Warning',
    description: 'Severe thunderstorms expected through midnight.',
    source: 'NWS',
    severity: 'extreme',
    geometry: null,
  },
  {
    id: 'a2',
    title: 'Heavy Rain Advisory',
    description: 'Rainfall rates up to 2 inches per hour.',
    source: 'Open-Meteo',
    severity: 'moderate',
    geometry: null,
  },
]

describe('AlertDetailSheet', () => {
  it('renders nothing when not visible', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(
        <AlertDetailSheet alerts={ALERTS} visible={false} onClose={jest.fn()} onSeeMap={jest.fn()} />,
      )
    })
    expect(JSON.stringify(tree.toJSON())).not.toMatch(/Thunderstorm/)
  })

  it('renders alert titles when visible', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(
        <AlertDetailSheet alerts={ALERTS} visible onClose={jest.fn()} onSeeMap={jest.fn()} />,
      )
    })
    const json = JSON.stringify(tree.toJSON())
    expect(json).toMatch(/Thunderstorm/)
    expect(json).toMatch(/Heavy Rain/)
  })

  it('renders "See on Map" button', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(
        <AlertDetailSheet alerts={ALERTS} visible onClose={jest.fn()} onSeeMap={jest.fn()} />,
      )
    })
    expect(JSON.stringify(tree.toJSON())).toMatch(/See on Map/)
  })

  it('renders nothing when alerts array is empty', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(
        <AlertDetailSheet alerts={[]} visible onClose={jest.fn()} onSeeMap={jest.fn()} />,
      )
    })
    expect(tree.toJSON()).toBeNull()
  })
})
