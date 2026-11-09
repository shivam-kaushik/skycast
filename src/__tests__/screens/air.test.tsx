import React from 'react'
import renderer, { act } from 'react-test-renderer'
import AirScreen from '@/app/(tabs)/air'
import { useLocationStore } from '@/src/store/locationStore'
import { usePrefsStore } from '@/src/store/prefsStore'
import type { AirQualityData } from '@/src/types/weather'
import { hasText, pressByTestId, pressText } from '@/src/utils/testScreenHelpers'

// First render of a screen is slow under parallel workers (RN + icon transforms); 5s is too tight.
jest.setTimeout(30_000)

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn() }
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }))

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => children ?? null,
}))

jest.mock('@/src/hooks/useAirQuality', () => ({ useAirQuality: jest.fn() }))
jest.mock('@/src/hooks/useWeather', () => ({ useWeather: jest.fn() }))

const stub = (name: string) => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  default: (props: object) => (require('react') as typeof import('react')).createElement(name, props),
})
jest.mock('@/src/components/air/AQIGauge', () => stub('AQIGaugeStub'))
jest.mock('@/src/components/air/PollenBars', () => stub('PollenBarsStub'))
jest.mock('@/src/components/air/PollutantList', () => stub('PollutantListStub'))
jest.mock('@/src/components/air/AllergyRiskIndex', () => stub('AllergyRiskStub'))
jest.mock('@/src/components/air/PollenTrendChart', () => stub('PollenTrendStub'))
jest.mock('@/src/components/home/LocationPickerModal', () => stub('PickerStub'))

const { useAirQuality } = jest.requireMock('@/src/hooks/useAirQuality') as { useAirQuality: jest.Mock }
const { useWeather } = jest.requireMock('@/src/hooks/useWeather') as { useWeather: jest.Mock }

function airQuality(overrides: { usAqi?: number; europeanAqi?: number; time?: string[] } = {}): AirQualityData {
  const time = overrides.time ?? ['2026-09-20T09:00', '2026-09-20T10:00', '2026-09-20T11:00']
  const zeros = time.map(() => 0)
  return {
    current: {
      pm10: 12, pm25: 6, co: 200, no2: 10, ozone: 60, so2: 2,
      usAqi: overrides.usAqi ?? 42, europeanAqi: overrides.europeanAqi ?? 30,
    },
    hourly: {
      time, pm10: zeros, pm25: zeros, no2: zeros, ozone: zeros,
      alderPollen: zeros, birchPollen: zeros, grassPollen: zeros,
      mugwortPollen: zeros, olivePollen: zeros, ragweedPollen: zeros,
    },
  }
}

const INITIAL_STORE = useLocationStore.getState()
const INITIAL_PREFS = usePrefsStore.getState()
let trees: renderer.ReactTestRenderer[] = []

async function render(): Promise<renderer.ReactTestRenderer> {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(<AirScreen />)
  })
  trees.push(tree)
  return tree
}

const find = (tree: renderer.ReactTestRenderer, type: string) => tree.root.findAllByType(type as never)

beforeEach(() => {
  jest.useFakeTimers({
    // Only freeze the clock; real timers keep act()/promises working.
    doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  })
  jest.setSystemTime(new Date(2026, 8, 20, 10, 30)) // local 10:30 → hour index 1 of the fixture
  Object.values(mockRouter).forEach((fn) => fn.mockReset())
  useAirQuality.mockReset().mockReturnValue({ data: airQuality(), isLoading: false })
  useWeather.mockReset().mockReturnValue({ data: undefined })
  usePrefsStore.setState(INITIAL_PREFS, true)
  useLocationStore.setState({ ...INITIAL_STORE, lat: 43.65, lon: -79.38, cityName: 'Toronto' }, true)
})

afterEach(() => {
  act(() => {
    trees.forEach((t) => t.unmount())
  })
  trees = []
  jest.useRealTimers()
})

describe('AirScreen — states', () => {
  it('shows a spinner while loading', async () => {
    useAirQuality.mockReturnValue({ data: undefined, isLoading: true })
    const tree = await render()

    expect(find(tree, 'AQIGaugeStub')).toHaveLength(0)
    expect(hasText(tree, 'Pollutant Breakdown')).toBe(false)
  })

  it('shows a spinner when there is no data yet', async () => {
    useAirQuality.mockReturnValue({ data: undefined, isLoading: false })
    const tree = await render()

    expect(find(tree, 'AQIGaugeStub')).toHaveLength(0)
  })

  it('fetches air quality and weather for the current location', async () => {
    await render()

    expect(useAirQuality).toHaveBeenCalledWith(43.65, -79.38)
    expect(useWeather).toHaveBeenCalledWith(43.65, -79.38)
  })
})

describe('AirScreen — content', () => {
  it('shows the city, falling back to a generic label', async () => {
    let tree = await render()
    expect(hasText(tree, 'Toronto')).toBe(true)

    useLocationStore.setState({ cityName: '' })
    tree = await render()
    expect(hasText(tree, 'Your Location')).toBe(true)
  })

  it('shows the preferred temperature unit', async () => {
    let tree = await render()
    expect(hasText(tree, '°C')).toBe(true)

    usePrefsStore.setState({ unit: 'F' })
    tree = await render()
    expect(hasText(tree, '°F')).toBe(true)
  })

  it('feeds the readings into the gauge, pollutant list and section headings', async () => {
    const data = airQuality({ usAqi: 88 })
    useAirQuality.mockReturnValue({ data, isLoading: false })
    const tree = await render()

    expect(find(tree, 'AQIGaugeStub')[0]?.props.aqi).toBe(88)
    expect(find(tree, 'PollutantListStub')[0]?.props.current).toBe(data.current)
    expect(hasText(tree, 'Pollutant Breakdown')).toBe(true)
    expect(hasText(tree, 'Allergen Outlook')).toBe(true)
  })

  it('points pollen widgets at the current hour', async () => {
    const tree = await render()

    expect(find(tree, 'PollenBarsStub')[0]?.props.currentHourIdx).toBe(1)
    expect(find(tree, 'PollenTrendStub')[0]?.props.startIdx).toBe(1)
  })

  it('falls back to the first hour when every forecast hour is in the past', async () => {
    useAirQuality.mockReturnValue({ data: airQuality({ time: ['2026-09-19T09:00', '2026-09-19T10:00'] }), isLoading: false })
    const tree = await render()

    expect(find(tree, 'PollenBarsStub')[0]?.props.currentHourIdx).toBe(0)
  })

  it('passes humidity and wind from the weather forecast to the allergy index', async () => {
    useWeather.mockReturnValue({ data: { current: { windSpeed: 18.4, windDirection: 90, humidity: 55 } } })
    const tree = await render()

    expect(find(tree, 'AllergyRiskStub')[0]?.props).toMatchObject({ humidity: 55, windSpeed: 18.4 })
    expect(hasText(tree, '18 km/h')).toBe(true)
    expect(hasText(tree, 'E')).toBe(true)
    expect(hasText(tree, '55%')).toBe(true)
  })

  it('defaults wind and humidity to zero without weather data', async () => {
    const tree = await render()

    expect(find(tree, 'AllergyRiskStub')[0]?.props).toMatchObject({ humidity: 0, windSpeed: 0 })
    expect(hasText(tree, '0 km/h')).toBe(true)
    expect(hasText(tree, 'N')).toBe(true)
  })
})

describe('AirScreen — European AQI label', () => {
  it.each([
    [0, 'Excellent'],
    [20, 'Excellent'],
    [21, 'Good'],
    [40, 'Good'],
    [41, 'Fair'],
    [60, 'Fair'],
    [61, 'Poor'],
    [80, 'Poor'],
    [81, 'Very poor'],
    [200, 'Very poor'],
  ])('rates European AQI %p as %s', async (europeanAqi, label) => {
    useAirQuality.mockReturnValue({ data: airQuality({ europeanAqi }), isLoading: false })
    const tree = await render()

    expect(hasText(tree, label)).toBe(true)
  })
})

describe('AirScreen — wind direction', () => {
  it.each([
    [0, 'N'], [22, 'N'], [23, 'NE'], [45, 'NE'], [90, 'E'], [135, 'SE'],
    [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW'], [350, 'N'],
  ])('labels %p° as %s', async (deg, compass) => {
    useWeather.mockReturnValue({ data: { current: { windSpeed: 10, windDirection: deg, humidity: 50 } } })
    const tree = await render()

    expect(hasText(tree, compass)).toBe(true)
  })
})

describe('AirScreen — navigation and picker', () => {
  it('opens the radar map', async () => {
    const tree = await render()

    await pressByTestId(tree, 'air-nav-radar-button')

    expect(mockRouter.push).toHaveBeenCalledWith('/radar')
  })

  it('opens the location picker from the header', async () => {
    const tree = await render()
    expect(find(tree, 'PickerStub')[0]?.props.visible).toBe(false)

    await pressText(tree, '°C')

    expect(find(tree, 'PickerStub')[0]?.props.visible).toBe(true)
  })

  it('closes the location picker', async () => {
    const tree = await render()
    await pressText(tree, '°C')

    act(() => {
      find(tree, 'PickerStub')[0]?.props.onClose()
    })

    expect(find(tree, 'PickerStub')[0]?.props.visible).toBe(false)
  })

  it('selects a manual location from the picker', async () => {
    const tree = await render()

    act(() => {
      find(tree, 'PickerStub')[0]?.props.onSelectLocation({ id: 'p', cityName: 'Paris', lat: 48.85, lon: 2.35 })
    })

    expect(useLocationStore.getState()).toMatchObject({ cityName: 'Paris', lat: 48.85, lon: 2.35, isManualSelection: true })
  })
})
