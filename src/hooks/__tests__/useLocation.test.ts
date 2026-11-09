import { Platform } from 'react-native'
import * as Location from 'expo-location'
import { peekSkycastWebE2e, useLocation } from '@/src/hooks/useLocation'
import { useLocationStore } from '@/src/store/locationStore'
import { renderHook, waitFor } from '@/src/utils/testHookHarness'

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}))

jest.mock('@/src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

const mockPermission = Location.requestForegroundPermissionsAsync as jest.Mock
const mockPosition = Location.getCurrentPositionAsync as jest.Mock
const mockGeocode = Location.reverseGeocodeAsync as jest.Mock

const INITIAL_STORE = useLocationStore.getState()
const restores: Array<() => void> = []

/** Temporarily define `target[key]`; restored automatically after each test. */
function stub(target: object, key: string, value: unknown): void {
  const original = Object.getOwnPropertyDescriptor(target, key)
  Object.defineProperty(target, key, { value, configurable: true, writable: true })
  restores.push(() => {
    if (original) Object.defineProperty(target, key, original)
    else Reflect.deleteProperty(target, key)
  })
}

function storageReturning(value: string | null): { getItem: (key: string) => string | null } {
  return { getItem: (key) => (key === '__skycast_e2e_web' ? value : null) }
}

function grantWithPosition(latitude: number, longitude: number): void {
  mockPermission.mockResolvedValue({ status: 'granted' })
  mockPosition.mockResolvedValue({ coords: { latitude, longitude } })
}

beforeEach(() => {
  useLocationStore.setState(INITIAL_STORE, true)
  mockPermission.mockReset()
  mockPosition.mockReset()
  mockGeocode.mockReset().mockResolvedValue([])
})

afterEach(() => {
  while (restores.length > 0) restores.pop()?.()
  delete process.env.EXPO_PUBLIC_SKYCAST_E2E_WEB
})

describe('peekSkycastWebE2e', () => {
  it('is false in a normal native environment', () => {
    expect(peekSkycastWebE2e()).toBe(false)
  })

  it('detects navigator.webdriver', () => {
    stub(navigator, 'webdriver', true)
    expect(peekSkycastWebE2e()).toBe(true)
  })

  it.each(['HeadlessChrome/120', 'Mozilla Playwright/1.0'])('detects the automation user agent %s', (ua) => {
    stub(navigator, 'userAgent', ua)
    expect(peekSkycastWebE2e()).toBe(true)
  })

  it('detects the sessionStorage flag', () => {
    stub(globalThis, 'sessionStorage', storageReturning('1'))
    expect(peekSkycastWebE2e()).toBe(true)
  })

  it('detects the localStorage flag', () => {
    stub(globalThis, 'localStorage', storageReturning('1'))
    expect(peekSkycastWebE2e()).toBe(true)
  })

  it('ignores storage flags that are not "1"', () => {
    stub(globalThis, 'sessionStorage', storageReturning('0'))
    expect(peekSkycastWebE2e()).toBe(false)
  })

  it('detects the cookie flag', () => {
    stub(globalThis, 'document', { cookie: 'a=b; __skycast_e2e_web=1' })
    expect(peekSkycastWebE2e()).toBe(true)
  })

  it('detects the skycast_e2e URL query param', () => {
    stub(window, 'location', { search: '?skycast_e2e=1' })
    expect(peekSkycastWebE2e()).toBe(true)
  })

  it('survives a storage accessor that throws', () => {
    stub(globalThis, 'sessionStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
    })
    expect(peekSkycastWebE2e()).toBe(false)
  })

  describe('on web', () => {
    beforeEach(() => {
      stub(Platform, 'OS', 'web')
    })

    it('detects the EXPO_PUBLIC_SKYCAST_E2E_WEB env flag', () => {
      process.env.EXPO_PUBLIC_SKYCAST_E2E_WEB = '1'
      expect(peekSkycastWebE2e()).toBe(true)
    })

    it('detects the global __SKYCAST_E2E_WEB flag', () => {
      stub(globalThis, '__SKYCAST_E2E_WEB', true)
      expect(peekSkycastWebE2e()).toBe(true)
    })

    it('is false when no flag is set', () => {
      expect(peekSkycastWebE2e()).toBe(false)
    })
  })

  it('ignores the env and global flags off web', () => {
    process.env.EXPO_PUBLIC_SKYCAST_E2E_WEB = '1'
    stub(globalThis, '__SKYCAST_E2E_WEB', true)
    expect(peekSkycastWebE2e()).toBe(false)
  })
})

describe('useLocation', () => {
  it('applies fixed San Francisco coordinates in web E2E mode without asking for permission', async () => {
    stub(globalThis, 'sessionStorage', storageReturning('1'))
    renderHook(() => useLocation())

    await waitFor(() => useLocationStore.getState().lat !== null)

    expect(useLocationStore.getState()).toMatchObject({
      lat: 37.7749,
      lon: -122.4194,
      cityName: 'San Francisco',
      locationLoading: false,
      isManualSelection: false,
    })
    expect(mockPermission).not.toHaveBeenCalled()
  })

  it('skips the device lookup when the user picked a location manually', async () => {
    useLocationStore.setState({ isManualSelection: true, lat: 10, lon: 20, cityName: 'Manual' })
    renderHook(() => useLocation())

    await waitFor(() => !useLocationStore.getState().locationLoading)

    expect(mockPermission).not.toHaveBeenCalled()
    expect(useLocationStore.getState().cityName).toBe('Manual')
  })

  it('reports a denied permission and never reads the position', async () => {
    mockPermission.mockResolvedValue({ status: 'denied' })
    const result = renderHook(() => useLocation())

    await waitFor(() => useLocationStore.getState().locationPermissionDenied)

    expect(mockPosition).not.toHaveBeenCalled()
    expect(useLocationStore.getState()).toMatchObject({
      locationError: 'Location permission denied',
      locationLoading: false,
    })
    expect(result.current).toEqual({ loading: false, error: 'Location permission denied', permissionDenied: true })
  })

  it('stores the device position with the geocoded city', async () => {
    grantWithPosition(43.65, -79.38)
    mockGeocode.mockResolvedValue([{ city: 'Toronto', region: 'Ontario' }])
    renderHook(() => useLocation())

    await waitFor(() => useLocationStore.getState().lat !== null)

    expect(mockPosition).toHaveBeenCalledWith({ accuracy: 3 })
    expect(mockGeocode).toHaveBeenCalledWith({ latitude: 43.65, longitude: -79.38 })
    expect(useLocationStore.getState()).toMatchObject({
      lat: 43.65,
      lon: -79.38,
      cityName: 'Toronto',
      deviceLat: 43.65,
      deviceLon: -79.38,
      deviceCityName: 'Toronto',
      locationLoading: false,
      locationError: null,
      locationPermissionDenied: false,
    })
  })

  it.each([
    [{ district: 'Downtown', subregion: 'Peel', region: 'Ontario' }, 'Downtown'],
    [{ subregion: 'Peel', region: 'Ontario' }, 'Peel'],
    [{ region: 'Ontario' }, 'Ontario'],
    [{}, 'Your Location'],
  ])('falls back through city → district → subregion → region for %j', async (place, expected) => {
    grantWithPosition(1, 2)
    mockGeocode.mockResolvedValue([place])
    renderHook(() => useLocation())

    await waitFor(() => useLocationStore.getState().lat !== null)

    expect(useLocationStore.getState().cityName).toBe(expected)
  })

  it('still stores coordinates when reverse geocoding fails', async () => {
    grantWithPosition(1, 2)
    mockGeocode.mockRejectedValue(new Error('no geocoder'))
    renderHook(() => useLocation())

    await waitFor(() => useLocationStore.getState().lat !== null)

    expect(useLocationStore.getState()).toMatchObject({ lat: 1, lon: 2, cityName: 'Your Location' })
  })

  it('surfaces an Error thrown while reading the position', async () => {
    mockPermission.mockResolvedValue({ status: 'granted' })
    mockPosition.mockRejectedValue(new Error('GPS off'))
    renderHook(() => useLocation())

    await waitFor(() => useLocationStore.getState().locationError === 'GPS off')

    expect(useLocationStore.getState().locationLoading).toBe(false)
    expect(useLocationStore.getState().lat).toBeNull()
  })

  it('uses a generic message when a non-Error is thrown', async () => {
    mockPermission.mockRejectedValue('weird')
    renderHook(() => useLocation())

    await waitFor(() => useLocationStore.getState().locationError === 'Failed to get location')

    expect(useLocationStore.getState().locationLoading).toBe(false)
  })

  it('does not update the store if unmounted before the lookup finishes', async () => {
    let releasePermission: (value: { status: string }) => void = () => {}
    mockPermission.mockReturnValue(new Promise((resolve) => { releasePermission = resolve }))
    mockPosition.mockResolvedValue({ coords: { latitude: 9, longitude: 9 } })
    const result = renderHook(() => useLocation())

    result.unmount()
    releasePermission({ status: 'granted' })
    await waitFor(() => mockPosition.mock.calls.length > 0)
    await waitFor(() => mockGeocode.mock.calls.length > 0)

    expect(useLocationStore.getState().lat).toBeNull()
    expect(useLocationStore.getState().locationLoading).toBe(true)
  })
})
