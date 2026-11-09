import React from 'react'
import renderer, { act } from 'react-test-renderer'
import HomeScreen from '@/app/(tabs)/index'
import { useLocationStore } from '@/src/store/locationStore'
import { usePrefsStore } from '@/src/store/prefsStore'
import { allText, hasText, hasTextContaining, pressByTestId, pressText } from '@/src/utils/testScreenHelpers'

// First render of a screen is slow under parallel workers (RN + icon transforms); 5s is too tight.
jest.setTimeout(30_000)

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), navigate: jest.fn() }
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }))

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => children ?? null,
}))

jest.mock('@/src/hooks/useWeather', () => ({ useWeather: jest.fn() }))
jest.mock('@/src/hooks/useAirQuality', () => ({ useAirQuality: jest.fn() }))
jest.mock('@/src/hooks/useWeatherAlerts', () => ({ useWeatherAlerts: jest.fn() }))

const stub = (name: string) => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  default: (props: object) => (require('react') as typeof import('react')).createElement(name, props),
})
jest.mock('@/src/components/home/DailyBriefCard', () => stub('BriefStub'))
jest.mock('@/src/components/home/WeatherAmbientBackground', () => stub('AmbientStub'))
jest.mock('@/src/components/home/HourlyStrip', () => stub('HourlyStub'))
jest.mock('@/src/components/home/ForecastList', () => stub('ForecastStub'))
jest.mock('@/src/components/home/MetricTilesGrid', () => stub('MetricsStub'))
jest.mock('@/src/components/home/LocationPickerModal', () => stub('PickerStub'))
jest.mock('@/src/components/home/DailyInsightsCarousel', () => stub('CarouselStub'))
jest.mock('@/src/components/home/RainProbabilityBar', () => stub('RainBarStub'))
jest.mock('@/src/components/home/PersonaInsightCard', () => stub('PersonaStub'))
jest.mock('@/src/components/home/SafetyAlertBadge', () => stub('AlertBadgeStub'))
jest.mock('@/src/components/home/AlertDetailSheet', () => stub('AlertSheetStub'))
jest.mock('@/src/components/home/ExtendedForecastCard', () => stub('ExtendedStub'))
jest.mock('@/src/components/shared/PremiumGate', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => children ?? null,
}))

const { useWeather } = jest.requireMock('@/src/hooks/useWeather') as { useWeather: jest.Mock }
const { useAirQuality } = jest.requireMock('@/src/hooks/useAirQuality') as { useAirQuality: jest.Mock }
const { useWeatherAlerts } = jest.requireMock('@/src/hooks/useWeatherAlerts') as { useWeatherAlerts: jest.Mock }

const WEATHER = {
  current: {
    temperature: 21.6, apparentTemperature: 19.2, humidity: 60, precipitationProbability: 35, weatherCode: 61,
    windSpeed: 14.6, windDirection: 50, windGusts: 25, pressure: 1015, visibility: 12, uvIndex: 5.4, cloudCover: 30,
  },
  hourly: { time: ['2026-09-20T10:00'], precipitationProbability: [10], weatherCode: [61] },
  daily: { time: ['2026-09-20', '2026-09-21'], sunrise: ['2026-09-20T06:30'], sunset: ['2026-09-20T19:00'] },
}
const AIR = { current: { usAqi: 42 }, hourly: { time: ['2026-09-20T10:00'], pm10: [1] } }
const ALERTS = [{ id: 'a1', title: 'Heat Advisory', severity: 'severe' }]

const INITIAL_STORE = useLocationStore.getState()
const INITIAL_PREFS = usePrefsStore.getState()
let trees: renderer.ReactTestRenderer[] = []

async function render(): Promise<renderer.ReactTestRenderer> {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(<HomeScreen />)
  })
  trees.push(tree)
  return tree
}

const find = (tree: renderer.ReactTestRenderer, type: string) => tree.root.findAllByType(type as never)
const props = (tree: renderer.ReactTestRenderer, type: string) => find(tree, type)[0]?.props

function mockWeather(overrides: Partial<Record<'data' | 'isLoading' | 'error', unknown>> = {}, refetch = jest.fn()): jest.Mock {
  useWeather.mockReturnValue({ data: WEATHER, isLoading: false, error: null, refetch, ...overrides })
  return refetch
}

beforeEach(() => {
  Object.values(mockRouter).forEach((fn) => fn.mockReset())
  mockWeather()
  useAirQuality.mockReset().mockReturnValue({ data: AIR })
  useWeatherAlerts.mockReset().mockReturnValue([])
  usePrefsStore.setState(INITIAL_PREFS, true)
  useLocationStore.setState(
    { ...INITIAL_STORE, lat: 43.65, lon: -79.38, cityName: 'Toronto', locationLoading: false, locationError: null, locationPermissionDenied: false },
    true,
  )
})

afterEach(() => {
  act(() => {
    trees.forEach((t) => t.unmount())
  })
  trees = []
})

describe('HomeScreen — gating states', () => {
  it('asks for location access when permission is denied', async () => {
    useLocationStore.setState({ locationPermissionDenied: true })
    const tree = await render()

    expect(hasText(tree, 'Location Required')).toBe(true)
    expect(hasText(tree, 'Please enable location access in Settings to use Skycast.')).toBe(true)
  })

  it('reports that permission is denied even while loading', async () => {
    useLocationStore.setState({ locationPermissionDenied: true, locationLoading: true })
    const tree = await render()

    expect(hasText(tree, 'Location Required')).toBe(true)
  })

  it('shows location progress while the device position is resolved', async () => {
    useLocationStore.setState({ locationLoading: true })
    const tree = await render()

    expect(hasText(tree, 'Getting your location…')).toBe(true)
  })

  it('shows weather progress while the forecast loads', async () => {
    mockWeather({ data: undefined, isLoading: true })
    const tree = await render()

    expect(hasText(tree, 'Loading weather…')).toBe(true)
  })

  it('shows the forecast error and retries on demand', async () => {
    const refetch = mockWeather({ data: undefined, error: new Error('API down') })
    const tree = await render()

    expect(hasText(tree, "Couldn't Load Weather")).toBe(true)
    expect(hasText(tree, 'API down')).toBe(true)

    await pressText(tree, 'Try Again')
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('shows a location error when the forecast itself is fine', async () => {
    useLocationStore.setState({ locationError: 'GPS unavailable' })
    const tree = await render()

    expect(hasText(tree, "Couldn't Load Weather")).toBe(true)
    expect(hasText(tree, 'GPS unavailable')).toBe(true)
  })

  it('falls back to a generic message when the error carries none', async () => {
    mockWeather({ data: undefined, error: {} })
    const tree = await render()

    expect(hasText(tree, 'Please check your connection.')).toBe(true)
  })

  it('renders nothing when there is neither data nor an error', async () => {
    mockWeather({ data: undefined })
    const tree = await render()

    expect(tree.toJSON()).toBeNull()
  })
})

describe('HomeScreen — hero', () => {
  it('shows the rounded Celsius temperature, conditions and city', async () => {
    const tree = await render()

    expect(hasText(tree, '22')).toBe(true)
    expect(hasText(tree, "It's slight rain")).toBe(true)
    expect(hasTextContaining(tree, 'celsius')).toBe(true)
    expect(hasText(tree, 'Toronto')).toBe(true)
    expect(hasText(tree, '°C')).toBe(true)
  })

  it('shows the rounded Fahrenheit temperature in Fahrenheit mode', async () => {
    usePrefsStore.setState({ unit: 'F' })
    const tree = await render()

    expect(hasText(tree, '71')).toBe(true) // 21.6°C
    expect(hasText(tree, '67°')).toBe(true) // feels like 19.2°C
    expect(hasTextContaining(tree, 'fahrenheit')).toBe(true)
  })

  it('shows feels-like, wind, UV and rain chance', async () => {
    const tree = await render()

    expect(hasText(tree, '19°')).toBe(true)
    expect(hasText(tree, 'NE')).toBe(true) // 50° → NE
    expect(hasText(tree, '15 km/h')).toBe(true)
    expect(hasText(tree, '5')).toBe(true)
    expect(hasText(tree, '35%')).toBe(true)
  })

  it('falls back to a generic city label', async () => {
    useLocationStore.setState({ cityName: '' })
    const tree = await render()

    expect(allText(tree).filter((t) => t === 'Your Location').length).toBeGreaterThan(0)
  })

  it('toggles the unit from the pill', async () => {
    const tree = await render()

    await pressByTestId(tree, 'home-unit-toggle')
    expect(usePrefsStore.getState().unit).toBe('F')

    await pressByTestId(tree, 'home-unit-toggle')
    expect(usePrefsStore.getState().unit).toBe('C')
  })

  it('opens the location picker', async () => {
    const tree = await render()
    expect(props(tree, 'PickerStub')?.visible).toBe(false)

    await pressByTestId(tree, 'home-location-trigger')

    expect(props(tree, 'PickerStub')?.visible).toBe(true)
  })

  it('closes the picker and applies a manual selection', async () => {
    const tree = await render()
    await pressByTestId(tree, 'home-location-trigger')

    act(() => {
      props(tree, 'PickerStub')?.onSelectLocation({ id: 'p', cityName: 'Paris', lat: 48.85, lon: 2.35 })
      props(tree, 'PickerStub')?.onClose()
    })

    expect(useLocationStore.getState()).toMatchObject({ cityName: 'Paris', isManualSelection: true })
    expect(props(tree, 'PickerStub')?.visible).toBe(false)
  })
})

describe('HomeScreen — data wiring', () => {
  it('fetches weather, air quality and alerts for the current location', async () => {
    await render()

    expect(useWeather).toHaveBeenCalledWith(43.65, -79.38)
    expect(useAirQuality).toHaveBeenCalledWith(43.65, -79.38)
    expect(useWeatherAlerts).toHaveBeenCalledWith(43.65, -79.38, 61, 35)
  })

  it('drives the ambient background from the current conditions', async () => {
    const tree = await render()

    expect(props(tree, 'AmbientStub')).toMatchObject({
      weatherCode: 61,
      precipitationProbability: 35,
      sunrise: '2026-09-20T06:30',
      sunset: '2026-09-20T19:00',
    })
    expect(typeof props(tree, 'AmbientStub')?.isDay).toBe('boolean')
  })

  it('passes forecast data and unit to the forecast widgets', async () => {
    usePrefsStore.setState({ unit: 'F' })
    const tree = await render()

    expect(props(tree, 'HourlyStub')).toMatchObject({ hourly: WEATHER.hourly, daily: WEATHER.daily, unit: 'F' })
    expect(props(tree, 'ForecastStub')).toMatchObject({ daily: WEATHER.daily, unit: 'F', days: 14 })
    expect(props(tree, 'ExtendedStub')).toMatchObject({ daily: WEATHER.daily, unit: 'F' })
    expect(props(tree, 'MetricsStub')?.current).toBe(WEATHER.current)
    expect(props(tree, 'BriefStub')).toMatchObject({ current: WEATHER.current, hourly: WEATHER.hourly })
    expect(props(tree, 'RainBarStub')?.hourly).toBe(WEATHER.hourly)
  })

  it('gives the insights carousel today’s date and the air-quality data', async () => {
    const tree = await render()

    expect(props(tree, 'CarouselStub')).toMatchObject({ today: '2026-09-20', unit: 'C', airQuality: AIR })
  })

  it('omits air quality from the carousel when it is unavailable', async () => {
    useAirQuality.mockReturnValue({ data: undefined })
    const tree = await render()

    expect(props(tree, 'CarouselStub')?.airQuality).toBeUndefined()
  })

  it('gives the persona card the current readings and an empty pollen series without air data', async () => {
    useAirQuality.mockReturnValue({ data: undefined })
    const tree = await render()

    expect(props(tree, 'PersonaStub')).toMatchObject({
      today: '2026-09-20',
      humidity: 60,
      windSpeed: 14.6,
      uvIndex: 5.4,
      airHourly: expect.objectContaining({ time: [], grassPollen: [], ragweedPollen: [] }),
    })
  })

  it('uses the real hourly air data for the persona card when available', async () => {
    const tree = await render()

    expect(props(tree, 'PersonaStub')?.airHourly).toBe(AIR.hourly)
  })
})

describe('HomeScreen — safety alerts', () => {
  it('shows no alert badge when there are no alerts', async () => {
    const tree = await render()

    expect(find(tree, 'AlertBadgeStub')).toHaveLength(0)
    expect(props(tree, 'AlertSheetStub')?.visible).toBe(false)
  })

  it('shows the badge and opens the detail sheet from it', async () => {
    useWeatherAlerts.mockReturnValue(ALERTS)
    const tree = await render()
    expect(props(tree, 'AlertBadgeStub')?.alerts).toBe(ALERTS)

    act(() => {
      props(tree, 'AlertBadgeStub')?.onPress()
    })

    expect(props(tree, 'AlertSheetStub')).toMatchObject({ alerts: ALERTS, visible: true })
  })

  it('closes the detail sheet', async () => {
    useWeatherAlerts.mockReturnValue(ALERTS)
    const tree = await render()
    act(() => {
      props(tree, 'AlertBadgeStub')?.onPress()
    })

    act(() => {
      props(tree, 'AlertSheetStub')?.onClose()
    })

    expect(props(tree, 'AlertSheetStub')?.visible).toBe(false)
  })

  it('closes the sheet and jumps to the radar when "see map" is chosen', async () => {
    useWeatherAlerts.mockReturnValue(ALERTS)
    const tree = await render()
    act(() => {
      props(tree, 'AlertBadgeStub')?.onPress()
    })

    act(() => {
      props(tree, 'AlertSheetStub')?.onSeeMap()
    })

    expect(props(tree, 'AlertSheetStub')?.visible).toBe(false)
    expect(mockRouter.navigate).toHaveBeenCalledWith('/radar')
  })
})
