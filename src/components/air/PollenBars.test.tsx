import React from 'react'
import renderer from 'react-test-renderer'
import PollenBars from './PollenBars'
import type { AirQualityData } from '@/src/types/weather'

function makeHourly(overrides: Partial<AirQualityData['hourly']> = {}): AirQualityData['hourly'] {
  const hours = ['2026-04-01T12:00', '2026-04-01T13:00']
  return {
    time: hours,
    pm10: [1, 1],
    pm25: [1, 1],
    no2: [1, 1],
    ozone: [1, 1],
    alderPollen: [null, null],
    birchPollen: [null, null],
    grassPollen: [null, null],
    mugwortPollen: [null, null],
    olivePollen: [null, null],
    ragweedPollen: [null, null],
    ...overrides,
  }
}

describe('PollenBars', () => {
  it('shows unavailable copy when all pollen values are null', () => {
    const tree = renderer
      .create(<PollenBars hourly={makeHourly()} currentHourIdx={0} />)
      .toJSON()
    expect(JSON.stringify(tree)).toMatch(/No pollen data here/)
  })

  it('renders a level row when pollen has a numeric value', () => {
    const hourly = makeHourly({
      grassPollen: [25, 25],
      birchPollen: [0, 0],
      ragweedPollen: [0, 0],
      alderPollen: [0, 0],
      olivePollen: [0, 0],
      mugwortPollen: [0, 0],
    })
    const json = JSON.stringify(renderer.create(<PollenBars hourly={hourly} currentHourIdx={0} />).toJSON())
    expect(json).toMatch(/Grass/)
    expect(json).toMatch(/Moderate/)
  })
})
