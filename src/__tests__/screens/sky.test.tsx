import React from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import renderer, { act } from 'react-test-renderer'
import { format } from 'date-fns'
import SkyScreen from '@/app/(tabs)/sky'
import { useLocationStore } from '@/src/store/locationStore'
import { hasText } from '@/src/utils/testScreenHelpers'

// First render of a screen is slow under parallel workers (RN + icon transforms); 5s is too tight.
jest.setTimeout(30_000)

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

jest.mock('@/src/hooks/useWeather', () => ({ useWeather: jest.fn() }))
jest.mock('@/src/hooks/useLunar', () => ({ useLunar: jest.fn() }))
jest.mock('@/src/hooks/useSkyPhenomena', () => ({ useSkyPhenomena: jest.fn() }))

const stub = (name: string) => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  default: (props: object) => (require('react') as typeof import('react')).createElement(name, props),
})
jest.mock('@/src/components/sky/MoonHero', () => stub('MoonHeroStub'))
jest.mock('@/src/components/sky/SkyTiles', () => stub('SkyTilesStub'))
jest.mock('@/src/components/sky/RainbowAlert', () => stub('RainbowAlertStub'))
jest.mock('@/src/components/sky/SunsetBar', () => stub('SunsetBarStub'))

const { useWeather } = jest.requireMock('@/src/hooks/useWeather') as { useWeather: jest.Mock }
const { useLunar } = jest.requireMock('@/src/hooks/useLunar') as { useLunar: jest.Mock }
const { useSkyPhenomena } = jest.requireMock('@/src/hooks/useSkyPhenomena') as { useSkyPhenomena: jest.Mock }

const LUNAR = { phaseName: 'Full Moon', illumination: 1 }
const RAINBOW = { likelyAt: new Date('2026-09-20T18:00:00Z'), faceDirection: 'E' }
const PHENOMENA = { stargazingScore: 7, sunsetScore: 8, rainbowWindow: null }
const HOURLY = { time: ['2026-09-20T10:00'] }
const INITIAL_STORE = useLocationStore.getState()
let trees: renderer.ReactTestRenderer[] = []

async function render(): Promise<renderer.ReactTestRenderer> {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(<SkyScreen />)
  })
  trees.push(tree)
  return tree
}

const find = (tree: renderer.ReactTestRenderer, type: string) => tree.root.findAllByType(type as never)

beforeEach(() => {
  useWeather.mockReset().mockReturnValue({ data: undefined })
  useLunar.mockReset().mockReturnValue(null)
  useSkyPhenomena.mockReset().mockReturnValue(null)
  useLocationStore.setState({ ...INITIAL_STORE, lat: 43.65, lon: -79.38, cityName: 'Toronto' }, true)
})

afterEach(() => {
  act(() => {
    trees.forEach((t) => t.unmount())
  })
  trees = []
})

describe('SkyScreen', () => {
  it('shows the city and today’s date', async () => {
    const tree = await render()

    expect(hasText(tree, 'Toronto')).toBe(true)
    expect(hasText(tree, format(new Date(), 'EEEE, MMM d'))).toBe(true)
  })

  it('pads the scroll content by the safe-area insets', async () => {
    const tree = await render()

    const style = StyleSheet.flatten(tree.root.findByType(ScrollView).props.contentContainerStyle)

    expect(style).toMatchObject({ paddingTop: 60, paddingBottom: 114 })
  })

  it('shows loading placeholders until data arrives', async () => {
    const tree = await render()

    expect(hasText(tree, 'Loading lunar data…')).toBe(true)
    expect(hasText(tree, 'Loading sky data…')).toBe(true)
    expect(hasText(tree, 'Loading…')).toBe(true)
    expect(find(tree, 'MoonHeroStub')).toHaveLength(0)
    expect(find(tree, 'SkyTilesStub')).toHaveLength(0)
    expect(find(tree, 'SunsetBarStub')).toHaveLength(0)
  })

  it('shows the moon as soon as lunar data is available', async () => {
    useLunar.mockReturnValue(LUNAR)
    const tree = await render()

    expect(find(tree, 'MoonHeroStub')[0]?.props.lunar).toBe(LUNAR)
    expect(hasText(tree, 'Loading lunar data…')).toBe(false)
    // sky tiles need both lunar and phenomena
    expect(hasText(tree, 'Loading sky data…')).toBe(true)
  })

  it('shows sky tiles and the sunset bar once phenomena are available', async () => {
    useLunar.mockReturnValue(LUNAR)
    useSkyPhenomena.mockReturnValue(PHENOMENA)
    const tree = await render()

    expect(find(tree, 'SkyTilesStub')[0]?.props).toMatchObject({ phenomena: PHENOMENA, lunar: LUNAR })
    expect(find(tree, 'SunsetBarStub')[0]?.props.score).toBe(8)
    expect(hasText(tree, 'Loading…')).toBe(false)
  })

  it('needs lunar data for the tiles but not for the sunset bar', async () => {
    useSkyPhenomena.mockReturnValue(PHENOMENA)
    const tree = await render()

    expect(find(tree, 'SkyTilesStub')).toHaveLength(0)
    expect(find(tree, 'SunsetBarStub')).toHaveLength(1)
  })

  it('passes today’s sunset to the sunset bar', async () => {
    useWeather.mockReturnValue({ data: { hourly: HOURLY, daily: { sunset: ['2026-09-20T19:05'] } } })
    useSkyPhenomena.mockReturnValue(PHENOMENA)
    const tree = await render()

    expect(find(tree, 'SunsetBarStub')[0]?.props.sunsetTime).toEqual(new Date('2026-09-20T19:05'))
  })

  it('passes a null sunset time when the forecast has none', async () => {
    useWeather.mockReturnValue({ data: { hourly: HOURLY, daily: { sunset: [] } } })
    useSkyPhenomena.mockReturnValue(PHENOMENA)
    const tree = await render()

    expect(find(tree, 'SunsetBarStub')[0]?.props.sunsetTime).toBeNull()
  })

  it('feeds hourly data and coordinates into the sky-phenomena hook', async () => {
    useWeather.mockReturnValue({ data: { hourly: HOURLY, daily: { sunset: [] } } })

    await render()

    expect(useSkyPhenomena).toHaveBeenCalledWith(HOURLY, 43.65, -79.38)
    expect(useLunar).toHaveBeenCalledWith(43.65, -79.38)
  })

  it('shows a rainbow alert only when a rainbow is likely', async () => {
    useSkyPhenomena.mockReturnValue({ ...PHENOMENA, rainbowWindow: RAINBOW })
    const tree = await render()

    expect(hasText(tree, 'PHENOMENA')).toBe(true)
    expect(find(tree, 'RainbowAlertStub')[0]?.props.window).toBe(RAINBOW)
  })

  it('hides the phenomena section without a rainbow window', async () => {
    useSkyPhenomena.mockReturnValue(PHENOMENA)
    const tree = await render()

    expect(hasText(tree, 'PHENOMENA')).toBe(false)
    expect(find(tree, 'RainbowAlertStub')).toHaveLength(0)
  })
})
