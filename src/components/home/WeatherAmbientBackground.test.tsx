import React from 'react'
import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated from 'react-native-reanimated'
import TestRenderer, { act } from 'react-test-renderer'
import WeatherAmbientBackground from '@/src/components/home/WeatherAmbientBackground'
import { rainOpacityForOvercast } from '@/src/utils/overcastRainAmbient'

// First render is slow under parallel workers; 5s is too tight.
jest.setTimeout(30_000)

const stub = (name: string) => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  default: (props: object) => (require('react') as typeof import('react')).createElement(name, props),
})
jest.mock('@/src/components/home/ClearDayAmbientLayers', () => stub('ClearDayStub'))
jest.mock('@/src/components/home/HorizonGlowLayer', () => stub('HorizonGlowStub'))
jest.mock('@/src/components/home/MoonLayer', () => stub('MoonStub'))

// One summer day: sunrise 06:00Z, sunset 20:00Z. Times below fall in each phase.
const SUNRISE = '2026-06-21T06:00:00Z'
const SUNSET = '2026-06-21T20:00:00Z'
const AT = {
  dawn: '2026-06-21T06:00:00Z',
  morning: '2026-06-21T09:00:00Z',
  afternoon: '2026-06-21T16:00:00Z',
  dusk: '2026-06-21T20:00:00Z',
  night: '2026-06-21T23:00:00Z',
} as const
type Phase = keyof typeof AT

// Weather codes by visual kind (see getAmbientVisualKind).
const CODE = { clear: 0, partly: 2, overcast: 3, fog: 45, rain: 61, snow: 71, thunder: 95 } as const

let trees: TestRenderer.ReactTestRenderer[] = []

/** Freeze only `Date`, leaving timers real so act()/promises/reanimated keep working. */
function freezeAt(iso: string): void {
  jest.useFakeTimers({
    now: new Date(iso),
    doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  })
}

interface Props {
  weatherCode: number
  isDay: boolean
  precipitationProbability?: number
  hourlyPrecipitationMax?: number
  hourlyForecastHasRainish?: boolean
  sunrise?: string
  sunset?: string
}

async function render(props: Props, phase: Phase | null = 'morning'): Promise<TestRenderer.ReactTestRenderer> {
  freezeAt(AT[phase ?? 'morning'])
  const withSun = phase === null ? props : { sunrise: SUNRISE, sunset: SUNSET, ...props }
  let tr!: TestRenderer.ReactTestRenderer
  await act(async () => {
    tr = TestRenderer.create(<WeatherAmbientBackground {...withSun} />)
  })
  trees.push(tr)
  return tr
}

/** The base sky palette is the first gradient rendered; later layers (bands, fog, vignette) add their own. */
const gradient = (tr: TestRenderer.ReactTestRenderer) => tr.root.findAllByType(LinearGradient)[0]!.props
const find = (tr: TestRenderer.ReactTestRenderer, type: string) => tr.root.findAllByType(type as never)
const animatedCount = (tr: TestRenderer.ReactTestRenderer) => tr.root.findAllByType(Animated.View).length

afterEach(() => {
  act(() => {
    trees.forEach((t) => t.unmount())
  })
  trees = []
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('WeatherAmbientBackground — base', () => {
  it('renders an unobtrusive, non-interactive full-screen layer', async () => {
    const tr = await render({ weatherCode: CODE.clear, isDay: true })

    expect(tr.toJSON()).toBeTruthy()
    expect(tr.root.findAllByType(View)[0]?.props.pointerEvents).toBe('none')
  })

  it('renders for rain and clear states', async () => {
    const rain = await render({ weatherCode: 65, isDay: true, precipitationProbability: 80, hourlyPrecipitationMax: 70 })
    const clear = await render({ weatherCode: 0, isDay: false, precipitationProbability: 0, hourlyPrecipitationMax: 0 })

    expect(rain.toJSON()).toBeTruthy()
    expect(clear.toJSON()).toBeTruthy()
  })
})

describe('WeatherAmbientBackground — gradient palette', () => {
  it.each<[string, Props, Phase, string, number, number[]]>([
    ['clear day, morning', { weatherCode: CODE.clear, isDay: true }, 'morning', '#1e74d4', 4, [0, 0.3, 0.62, 1]],
    ['clear day, afternoon', { weatherCode: CODE.clear, isDay: true }, 'afternoon', '#1040a8', 4, [0, 0.3, 0.62, 1]],
    ['clear day, dawn', { weatherCode: CODE.clear, isDay: true }, 'dawn', '#0e0b28', 5, [0, 0.22, 0.5, 0.76, 1]],
    ['clear day, dusk', { weatherCode: CODE.clear, isDay: true }, 'dusk', '#090720', 5, [0, 0.22, 0.5, 0.76, 1]],
    ['clear day, outside daylight phases', { weatherCode: CODE.clear, isDay: true }, 'night', '#1a5fb4', 4, [0, 0.3, 0.62, 1]],
    ['partly cloudy day, dawn', { weatherCode: CODE.partly, isDay: true }, 'dawn', '#0e0c2a', 5, [0, 0.22, 0.5, 0.76, 1]],
    ['partly cloudy day, dusk', { weatherCode: CODE.partly, isDay: true }, 'dusk', '#0a0822', 5, [0, 0.22, 0.5, 0.76, 1]],
    ['partly cloudy day, midday', { weatherCode: CODE.partly, isDay: true }, 'morning', '#2563a8', 4, [0, 0.3, 0.62, 1]],
    ['clear night', { weatherCode: CODE.clear, isDay: false }, 'night', '#050a14', 4, [0, 0.3, 0.62, 1]],
    ['partly cloudy night', { weatherCode: CODE.partly, isDay: false }, 'night', '#0a1524', 4, [0, 0.3, 0.62, 1]],
    ['overcast', { weatherCode: CODE.overcast, isDay: true }, 'morning', '#2a3444', 3, [0, 0.48, 1]],
    ['rain', { weatherCode: CODE.rain, isDay: true }, 'morning', '#080e18', 4, [0, 0.3, 0.62, 1]],
    ['snow', { weatherCode: CODE.snow, isDay: true }, 'morning', '#283548', 3, [0, 0.48, 1]],
    ['fog', { weatherCode: CODE.fog, isDay: true }, 'morning', '#3e4654', 3, [0, 0.48, 1]],
    ['thunder', { weatherCode: CODE.thunder, isDay: true }, 'morning', '#0c0614', 3, [0, 0.48, 1]],
  ])('uses the right palette for %s', async (_name, props, phase, first, length, locations) => {
    const tr = await render(props, phase)

    expect(gradient(tr).colors[0]).toBe(first)
    expect(gradient(tr).colors).toHaveLength(length)
    expect(gradient(tr).locations).toEqual(locations)
  })

  it('shows the rain palette for an overcast code with high precipitation probability', async () => {
    const tr = await render({ weatherCode: CODE.overcast, isDay: true, precipitationProbability: 60 })

    expect(gradient(tr).colors[0]).toBe('#080e18')
  })

  it('keeps the overcast palette below the rain threshold', async () => {
    const tr = await render({ weatherCode: CODE.overcast, isDay: true, precipitationProbability: 54 })

    expect(gradient(tr).colors[0]).toBe('#2a3444')
  })

  it('assumes a morning sky when sunrise/sunset are missing', async () => {
    const tr = await render({ weatherCode: CODE.clear, isDay: true }, null)

    expect(gradient(tr).colors[0]).toBe('#1e74d4')
  })

  it('assumes a morning sky when sunrise/sunset cannot be parsed', async () => {
    const tr = await render({ weatherCode: CODE.clear, isDay: true, sunrise: 'nope', sunset: 'nope' })

    expect(gradient(tr).colors[0]).toBe('#1e74d4')
  })
})

describe('WeatherAmbientBackground — atmospheric layers', () => {
  it.each<Phase>(['morning', 'afternoon', 'night'])('adds the sun bloom on a clear day (%s phase)', async (phase) => {
    const tr = await render({ weatherCode: CODE.clear, isDay: true }, phase)

    expect(find(tr, 'ClearDayStub').map((n) => n.props.variant)).toEqual(['clear'])
    expect(find(tr, 'HorizonGlowStub')).toHaveLength(0)
  })

  it.each<['dawn' | 'dusk']>([['dawn'], ['dusk']])('swaps the sun bloom for a horizon glow at %s', async (phase) => {
    const tr = await render({ weatherCode: CODE.clear, isDay: true }, phase)

    expect(find(tr, 'ClearDayStub')).toHaveLength(0)
    expect(find(tr, 'HorizonGlowStub').map((n) => n.props.variant)).toEqual([phase])
  })

  it('adds partly-cloudy daylight layers at midday', async () => {
    const tr = await render({ weatherCode: CODE.partly, isDay: true }, 'afternoon')

    expect(find(tr, 'ClearDayStub').map((n) => n.props.variant)).toEqual(['partly'])
    expect(find(tr, 'HorizonGlowStub')).toHaveLength(0)
  })

  it.each<['dawn' | 'dusk']>([['dawn'], ['dusk']])('adds a horizon glow but no sun bloom for partly cloudy at %s', async (phase) => {
    const tr = await render({ weatherCode: CODE.partly, isDay: true }, phase)

    expect(find(tr, 'ClearDayStub')).toHaveLength(0)
    expect(find(tr, 'HorizonGlowStub').map((n) => n.props.variant)).toEqual([phase])
  })

  it.each([
    ['clear night', CODE.clear],
    ['partly cloudy night', CODE.partly],
  ])('shows the moon on a %s', async (_name, weatherCode) => {
    const tr = await render({ weatherCode, isDay: false }, 'night')

    expect(find(tr, 'MoonStub')).toHaveLength(1)
    expect(find(tr, 'ClearDayStub')).toHaveLength(0)
  })

  it('does not show a horizon glow on a clear night, even at dusk', async () => {
    const tr = await render({ weatherCode: CODE.clear, isDay: false }, 'dusk')

    expect(find(tr, 'HorizonGlowStub')).toHaveLength(0)
    expect(find(tr, 'MoonStub')).toHaveLength(1)
  })

  it.each([
    ['rain', CODE.rain],
    ['snow', CODE.snow],
    ['fog', CODE.fog],
    ['thunder', CODE.thunder],
    ['overcast', CODE.overcast],
  ])('shows no sun, moon or glow layers in %s conditions', async (_name, weatherCode) => {
    const tr = await render({ weatherCode, isDay: true }, 'afternoon')

    expect(find(tr, 'ClearDayStub')).toHaveLength(0)
    expect(find(tr, 'MoonStub')).toHaveLength(0)
    expect(find(tr, 'HorizonGlowStub')).toHaveLength(0)
  })
})

describe('WeatherAmbientBackground — particles', () => {
  it('animates rain drops for rain and thunder, far more than for a clear sky', async () => {
    const clear = await render({ weatherCode: CODE.clear, isDay: true })
    const rain = await render({ weatherCode: CODE.rain, isDay: true })
    const thunder = await render({ weatherCode: CODE.thunder, isDay: true })

    expect(animatedCount(rain) - animatedCount(clear)).toBeGreaterThanOrEqual(150)
    expect(animatedCount(thunder)).toBeGreaterThanOrEqual(animatedCount(rain))
  })

  it('animates snowflakes for snow', async () => {
    const clear = await render({ weatherCode: CODE.clear, isDay: true })
    const snow = await render({ weatherCode: CODE.snow, isDay: true })

    expect(animatedCount(snow) - animatedCount(clear)).toBeGreaterThanOrEqual(50)
  })

  it('animates stars on clear and partly cloudy nights', async () => {
    const day = await render({ weatherCode: CODE.clear, isDay: true }, 'morning')
    const clearNight = await render({ weatherCode: CODE.clear, isDay: false }, 'night')
    const partlyNight = await render({ weatherCode: CODE.partly, isDay: false }, 'night')

    expect(animatedCount(clearNight) - animatedCount(day)).toBeGreaterThanOrEqual(40)
    expect(animatedCount(partlyNight)).toBeGreaterThanOrEqual(48)
  })

  it('clears the thunder flash timer when unmounted', async () => {
    const clearInterval = jest.spyOn(global, 'clearInterval')
    const tr = await render({ weatherCode: CODE.thunder, isDay: true })

    await act(async () => {
      tr.unmount()
    })
    trees = []

    expect(clearInterval).toHaveBeenCalled()
  })
})

describe('WeatherAmbientBackground — overcast rain', () => {
  const DROPS = 118 + 72 // both overcast rain fields

  async function overcast(props: Omit<Props, 'weatherCode' | 'isDay'>): Promise<TestRenderer.ReactTestRenderer> {
    return render({ weatherCode: CODE.overcast, isDay: true, ...props })
  }

  it('stays dry with no precipitation signal', async () => {
    const dry = await overcast({})
    const wet = await overcast({ hourlyPrecipitationMax: 60, hourlyForecastHasRainish: true })

    expect(animatedCount(wet) - animatedCount(dry)).toBe(DROPS)
  })

  it('rains when the hourly forecast has rain codes and the signal is meaningful', async () => {
    const dry = await overcast({})
    const wet = await overcast({ precipitationProbability: 10, hourlyPrecipitationMax: 30, hourlyForecastHasRainish: true })

    expect(animatedCount(wet) - animatedCount(dry)).toBe(DROPS)
  })

  it('does not rain on precipitation percentage alone when the hourly icons stay dry', async () => {
    const dry = await overcast({})
    const gated = await overcast({ precipitationProbability: 10, hourlyPrecipitationMax: 30, hourlyForecastHasRainish: false })

    expect(animatedCount(gated)).toBe(animatedCount(dry))
  })

  it('rains when current precipitation probability is already 45% or more, even without rain codes', async () => {
    const dry = await overcast({})
    const wet = await overcast({ precipitationProbability: 45, hourlyForecastHasRainish: false })

    expect(animatedCount(wet) - animatedCount(dry)).toBe(DROPS)
  })

  it('does not rain when the combined signal is below the minimum, even with rain codes', async () => {
    const dry = await overcast({})
    const faint = await overcast({ precipitationProbability: 5, hourlyPrecipitationMax: 15, hourlyForecastHasRainish: true })

    expect(animatedCount(faint)).toBe(animatedCount(dry))
  })

  it('scales the rain layer opacity with the strongest of current and hourly precipitation', async () => {
    const tr = await overcast({ precipitationProbability: 10, hourlyPrecipitationMax: 60, hourlyForecastHasRainish: true })

    const wrapper = tr.root.findAllByType(View).find((v) => typeof v.props.style?.opacity === 'number')
    expect(wrapper?.props.style.opacity).toBeCloseTo(rainOpacityForOvercast(60), 5)
  })
})
