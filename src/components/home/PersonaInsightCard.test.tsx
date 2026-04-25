import React from 'react'
import renderer, { act } from 'react-test-renderer'
import PersonaInsightCard from './PersonaInsightCard'
import { usePersonaStore } from '@/src/store/personaStore'
import type { HourlyWeather, DailyWeather, AirQualityData } from '@/src/types/weather'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

function makeHourly(): HourlyWeather {
  const n = 48
  const time = Array.from({ length: n }, (_, i) => {
    const d = new Date('2026-04-19T00:00:00.000Z')
    d.setHours(i)
    return d.toISOString().slice(0, 16)
  })
  return {
    time, temperature: Array(n).fill(18), apparentTemperature: Array(n).fill(17),
    precipitationProbability: Array(n).fill(10), precipitation: Array(n).fill(0),
    weatherCode: Array(n).fill(1), windSpeed: Array(n).fill(8), windGusts: Array(n).fill(10),
    uvIndex: Array(n).fill(3), cloudCover: Array(n).fill(20), visibility: Array(n).fill(15),
    humidity: Array(n).fill(55), surfacePressure: Array(n).fill(1013),
  }
}

function makeDaily(): DailyWeather {
  return {
    time: ['2026-04-19'], tempMax: [22], tempMin: [14], weatherCode: [1],
    precipitationSum: [0], precipitationProbabilityMax: [10], windSpeedMax: [15],
    windGustsMax: [20], uvIndexMax: [5], sunrise: ['2026-04-19T06:00'], sunset: ['2026-04-19T20:00'],
  }
}

function makeAirHourly(): AirQualityData['hourly'] {
  const n = 48
  return {
    time: Array(n).fill('2026-04-19T00:00'), pm10: Array(n).fill(5), pm25: Array(n).fill(3),
    no2: Array(n).fill(10), ozone: Array(n).fill(40),
    alderPollen: Array(n).fill(null), birchPollen: Array(n).fill(null),
    grassPollen: Array(n).fill(null), mugwortPollen: Array(n).fill(null),
    olivePollen: Array(n).fill(null), ragweedPollen: Array(n).fill(null),
  }
}

describe('PersonaInsightCard', () => {
  let instance: renderer.ReactTestRenderer | null = null

  afterEach(async () => {
    if (instance) {
      await act(async () => { instance!.unmount() })
      instance = null
    }
  })

  it('renders athlete activity insight', async () => {
    await act(async () => { usePersonaStore.setState({ persona: 'athlete' }) })
    await act(async () => {
      instance = renderer.create(
        <PersonaInsightCard
          hourly={makeHourly()} daily={makeDaily()} airHourly={makeAirHourly()}
          today="2026-04-19" currentHourIdx={10} humidity={55} windSpeed={8} uvIndex={3} usAqi={30}
        />
      )
    })
    expect(JSON.stringify(instance!.toJSON())).toMatch(/Activity Window/)
  })

  it('renders wellness health insight', async () => {
    await act(async () => { usePersonaStore.setState({ persona: 'wellness' }) })
    await act(async () => {
      instance = renderer.create(
        <PersonaInsightCard
          hourly={makeHourly()} daily={makeDaily()} airHourly={makeAirHourly()}
          today="2026-04-19" currentHourIdx={10} humidity={55} windSpeed={8} uvIndex={3} usAqi={30}
        />
      )
    })
    expect(JSON.stringify(instance!.toJSON())).toMatch(/Health Alert/)
  })
})
