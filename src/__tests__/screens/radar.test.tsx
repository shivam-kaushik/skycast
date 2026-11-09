import React from 'react'
import renderer, { act } from 'react-test-renderer'
import { format } from 'date-fns'
import RadarScreen from '@/app/(tabs)/radar'
import { useLocationStore } from '@/src/store/locationStore'
import { hasText, hasTextContaining, pressByProps, pressByTestId, pressText } from '@/src/utils/testScreenHelpers'

// First render of a screen is slow under parallel workers (RN + icon transforms); 5s is too tight.
jest.setTimeout(30_000)

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => children ?? null,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

// The map/globe/legend/scrubber/picker are stubbed as host elements so their props can be inspected and driven.
jest.mock('@/src/components/radar/WeatherMapView', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react') as typeof import('react')
  const handle = { play: jest.fn(), pause: jest.fn(), seekToFrame: jest.fn() }
  const WeatherMapView = R.forwardRef((props: object, ref: React.Ref<unknown>) => {
    R.useImperativeHandle(ref, () => handle)
    return R.createElement('MapStub', props)
  })
  return { __esModule: true, default: WeatherMapView, __handle: handle }
})
jest.mock('@/src/components/radar/GlobeView', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  default: (props: object) => (require('react') as typeof import('react')).createElement('GlobeStub', props),
}))
jest.mock('@/src/components/radar/RadarLegend', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  default: (props: object) => (require('react') as typeof import('react')).createElement('LegendStub', props),
}))
jest.mock('@/src/components/radar/RadarTimeScrubber', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  default: (props: object) => (require('react') as typeof import('react')).createElement('ScrubberStub', props),
}))
jest.mock('@/src/components/home/LocationPickerModal', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  default: (props: object) => (require('react') as typeof import('react')).createElement('PickerStub', props),
}))

jest.mock('@/src/hooks/useWeather', () => ({ useWeather: jest.fn() }))
jest.mock('@/src/hooks/useAirQuality', () => ({ useAirQuality: jest.fn() }))
jest.mock('@/src/hooks/useWeatherAlerts', () => ({ useWeatherAlerts: jest.fn() }))

const { useWeather } = jest.requireMock('@/src/hooks/useWeather') as { useWeather: jest.Mock }
const { useAirQuality } = jest.requireMock('@/src/hooks/useAirQuality') as { useAirQuality: jest.Mock }
const { useWeatherAlerts } = jest.requireMock('@/src/hooks/useWeatherAlerts') as { useWeatherAlerts: jest.Mock }
const { __handle: mapHandle } = jest.requireMock('@/src/components/radar/WeatherMapView') as {
  __handle: Record<'play' | 'pause' | 'seekToFrame', jest.Mock>
}

const WEATHER = {
  current: {
    temperature: 22, apparentTemperature: 21, humidity: 60, precipitationProbability: 20, weatherCode: 1,
    windSpeed: 15, windDirection: 270, windGusts: 25, pressure: 1015, visibility: 12, uvIndex: 5, cloudCover: 30,
  },
  hourly: {},
  daily: {},
}
const TIMES = ['2026-09-20T15:00:00.000Z', '2026-09-20T16:00:00.000Z', '2026-09-20T17:00:00.000Z']
const INITIAL_STORE = useLocationStore.getState()
let trees: renderer.ReactTestRenderer[] = []

async function render(): Promise<renderer.ReactTestRenderer> {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(<RadarScreen />)
  })
  trees.push(tree)
  return tree
}

const map = (tree: renderer.ReactTestRenderer) => tree.root.findByType('MapStub' as never)
const scrubber = (tree: renderer.ReactTestRenderer) => tree.root.findAllByType('ScrubberStub' as never)

/** Emit frames from the (stubbed) map, optionally marking the timeline as ready. */
function emitFrames(tree: renderer.ReactTestRenderer, { current = 0, total = 3, ready = true } = {}): void {
  act(() => {
    map(tree).props.onFrameUpdate(current, total, TIMES[current] ?? null)
    if (ready) map(tree).props.onTimelineReady(TIMES)
  })
}

async function chooseLayer(tree: renderer.ReactTestRenderer, label: string): Promise<void> {
  await pressByTestId(tree, 'radar-layer-trigger')
  await pressText(tree, label)
}

beforeEach(() => {
  useWeather.mockReset().mockReturnValue({ data: WEATHER, isLoading: false })
  useAirQuality.mockReset().mockReturnValue({ data: undefined, isLoading: false })
  useWeatherAlerts.mockReset().mockReturnValue([])
  Object.values(mapHandle).forEach((fn) => fn.mockReset())
  useLocationStore.setState({ ...INITIAL_STORE, lat: 43.65, lon: -79.38, cityName: 'Toronto' }, true)
})

afterEach(() => {
  act(() => {
    trees.forEach((t) => t.unmount())
  })
  trees = []
})

describe('RadarScreen — states', () => {
  it('shows a loading indicator while data loads', async () => {
    useWeather.mockReturnValue({ data: undefined, isLoading: true })
    const tree = await render()
    expect(hasText(tree, 'Loading map…')).toBe(true)
  })

  it('waits for air quality too', async () => {
    useAirQuality.mockReturnValue({ data: undefined, isLoading: true })
    const tree = await render()
    expect(hasText(tree, 'Loading map…')).toBe(true)
  })

  it('reports an unavailable location', async () => {
    useLocationStore.setState({ lat: null, lon: null })
    const tree = await render()
    expect(hasText(tree, 'Location unavailable')).toBe(true)
  })

  it('renders the precipitation map for the current location by default', async () => {
    const tree = await render()

    expect(map(tree).props).toMatchObject({ lat: 43.65, lon: -79.38, layer: 'precipitation' })
    expect(hasText(tree, 'Toronto')).toBe(true)
    expect(tree.root.findByType('LegendStub' as never).props.layer).toBe('precipitation')
  })

  it('falls back to a generic city label', async () => {
    useLocationStore.setState({ cityName: '' })
    const tree = await render()
    expect(hasText(tree, 'Your Location')).toBe(true)
  })
})

describe('RadarScreen — layer selection', () => {
  it('starts with the Radar layer and lists all four layers in the menu', async () => {
    const tree = await render()
    expect(hasText(tree, 'Radar')).toBe(true)

    await pressByTestId(tree, 'radar-layer-trigger')

    for (const label of ['Radar', 'Temp', 'Wind', 'Air']) expect(hasText(tree, label)).toBe(true)
  })

  it.each([
    ['Temp', 'temperature'],
    ['Wind', 'wind'],
    ['Air', 'air'],
  ])('switches to the %s layer', async (label, layer) => {
    const tree = await render()

    await chooseLayer(tree, label)

    expect(map(tree).props.layer).toBe(layer)
    expect(tree.root.findByType('LegendStub' as never).props.layer).toBe(layer)
  })

  it('closes the menu after choosing a layer', async () => {
    const tree = await render()

    await chooseLayer(tree, 'Wind')

    // only the trigger label remains; the menu's extra "Temp"/"Air" entries are gone
    expect(hasText(tree, 'Temp')).toBe(false)
    expect(hasText(tree, 'Air')).toBe(false)
  })
})

describe('RadarScreen — timeline', () => {
  it('is hidden until the map reports more than one frame', async () => {
    const tree = await render()
    expect(scrubber(tree)).toHaveLength(0)

    emitFrames(tree, { total: 1, ready: false })

    expect(hasText(tree, 'Map time')).toBe(false)
    expect(hasText(tree, 'Syncing radar…')).toBe(false)
  })

  it('shows a syncing state before tiles are ready', async () => {
    const tree = await render()

    emitFrames(tree, { ready: false })

    expect(hasText(tree, 'Syncing radar…')).toBe(true)
    expect(scrubber(tree)).toHaveLength(0)
  })

  it('shows the current map time and the scrubber once tiles are ready', async () => {
    const tree = await render()

    emitFrames(tree, { current: 1 })

    expect(hasText(tree, 'Map time')).toBe(true)
    expect(hasText(tree, format(new Date(TIMES[1]!), 'EEE h:mm a'))).toBe(true)
    expect(scrubber(tree)[0]?.props).toMatchObject({ times: TIMES, selectedIndex: 1, isPlaying: true })
  })

  it.each([['Temp'], ['Wind'], ['Air']])('is also shown for the %s layer', async (label) => {
    const tree = await render()
    await chooseLayer(tree, label)

    emitFrames(tree)

    expect(hasText(tree, 'Map time')).toBe(true)
    expect(scrubber(tree)).toHaveLength(1)
  })

  it('resets when the layer changes', async () => {
    const tree = await render()
    emitFrames(tree)
    expect(scrubber(tree)).toHaveLength(1)

    await chooseLayer(tree, 'Wind')

    expect(scrubber(tree)).toHaveLength(0)
    expect(hasText(tree, 'Map time')).toBe(false)
  })

  it('pauses and resumes playback from the play button', async () => {
    const tree = await render()
    emitFrames(tree)

    await pressByProps(tree, { activeOpacity: 0.75 })
    expect(mapHandle.pause).toHaveBeenCalledTimes(1)
    expect(scrubber(tree)[0]?.props.isPlaying).toBe(false)

    await pressByProps(tree, { activeOpacity: 0.75 })
    expect(mapHandle.play).toHaveBeenCalledTimes(1)
    expect(scrubber(tree)[0]?.props.isPlaying).toBe(true)
  })

  it('disables the play button until tiles are ready', async () => {
    const tree = await render()
    emitFrames(tree, { ready: false })

    // While syncing, the button renders with activeOpacity 1 and no press handler at all.
    const inert = tree.root.findAll((n) => n.props.activeOpacity === 1)
    expect(inert.length).toBeGreaterThan(0)
    expect(inert.every((n) => n.props.onPress === undefined)).toBe(true)

    emitFrames(tree, { ready: true })

    expect(tree.root.findAll((n) => n.props.activeOpacity === 0.75 && typeof n.props.onPress === 'function').length).toBeGreaterThan(0)
  })

  it('seeks and pauses when a frame is picked on the scrubber', async () => {
    const tree = await render()
    emitFrames(tree)

    act(() => {
      scrubber(tree)[0]?.props.onSelectIndex(2)
    })

    expect(mapHandle.seekToFrame).toHaveBeenCalledWith(2)
    expect(mapHandle.pause).toHaveBeenCalled()
    expect(scrubber(tree)[0]?.props.isPlaying).toBe(false)
  })

  it('pauses as soon as the user starts scrubbing', async () => {
    const tree = await render()
    emitFrames(tree)

    act(() => {
      scrubber(tree)[0]?.props.onInteractionStart()
    })

    expect(mapHandle.pause).toHaveBeenCalledTimes(1)
    expect(scrubber(tree)[0]?.props.isPlaying).toBe(false)
  })
})

describe('RadarScreen — map / globe', () => {
  it('swaps the map for the globe and back, hiding the legend on the globe', async () => {
    const tree = await render()

    await pressByTestId(tree, 'radar-view-toggle')
    expect(tree.root.findAllByType('GlobeStub' as never)).toHaveLength(1)
    expect(tree.root.findAllByType('MapStub' as never)).toHaveLength(0)
    expect(tree.root.findAllByType('LegendStub' as never)).toHaveLength(0)

    await pressByTestId(tree, 'radar-view-toggle')
    expect(tree.root.findAllByType('MapStub' as never)).toHaveLength(1)
    expect(tree.root.findAllByType('GlobeStub' as never)).toHaveLength(0)
  })

  it('gives the globe the current conditions and layer', async () => {
    const tree = await render()
    await chooseLayer(tree, 'Air')

    await pressByTestId(tree, 'radar-view-toggle')

    expect(tree.root.findByType('GlobeStub' as never).props).toMatchObject({
      lat: 43.65,
      lon: -79.38,
      layer: 'air',
      weather: expect.objectContaining({ temperature: 22, windSpeed: 15, usAqi: 0, conditionLabel: 'Mainly Clear' }),
    })
  })
})

describe('RadarScreen — alerts and location', () => {
  it('shows the top alert and how many more there are', async () => {
    useWeatherAlerts.mockReturnValue([
      { id: '1', title: 'Tornado Warning', severity: 'extreme' },
      { id: '2', title: 'Flood Watch', severity: 'severe' },
    ])
    const tree = await render()

    expect(hasTextContaining(tree, 'Tornado Warning')).toBe(true)
    expect(hasTextContaining(tree, '+1 more')).toBe(true)
  })

  it('dismisses the alert banner', async () => {
    useWeatherAlerts.mockReturnValue([{ id: '1', title: 'Heat Advisory', severity: 'severe' }])
    const tree = await render()

    await pressByProps(tree, { hitSlop: 10 })

    expect(hasTextContaining(tree, 'Heat Advisory')).toBe(false)
  })

  it('shows no banner without alerts', async () => {
    const tree = await render()
    expect(hasTextContaining(tree, 'more')).toBe(false)
  })

  it('opens the location picker', async () => {
    const tree = await render()
    expect(tree.root.findByType('PickerStub' as never).props.visible).toBe(false)

    await pressByTestId(tree, 'radar-location-trigger')

    expect(tree.root.findByType('PickerStub' as never).props.visible).toBe(true)
  })
})
