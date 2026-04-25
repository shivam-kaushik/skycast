import React from 'react'
import renderer, { act } from 'react-test-renderer'
import ForecastList from './ForecastList'

const daily = {
  time: Array.from({ length: 7 }, (_, i) => {
    const d = new Date('2026-04-25'); d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  }),
  tempMax: [25,24,23,26,27,22,20],
  tempMin: [15,14,13,16,17,12,11],
  weatherCode: [0,1,2,3,61,0,1],
  precipitationSum: [0,0,1,2,5,0,0],
  precipitationProbabilityMax: [5,10,30,50,80,10,5],
  windSpeedMax: [15,18,20,25,30,12,10],
  windGustsMax: [20,25,30,35,45,18,15],
  uvIndexMax: [5,4,3,2,1,6,7],
  sunrise: Array(7).fill('2026-04-25T06:00'),
  sunset: Array(7).fill('2026-04-25T19:00'),
}

describe('ForecastList', () => {
  it('renders 7 day forecast rows', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<ForecastList daily={daily} unit="C" />)
    })
    expect(JSON.stringify(tree.toJSON())).toMatch(/25°/)
  })

  it('renders in Fahrenheit', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<ForecastList daily={daily} unit="F" />)
    })
    expect(JSON.stringify(tree.toJSON())).toMatch(/77°/)
  })
})
