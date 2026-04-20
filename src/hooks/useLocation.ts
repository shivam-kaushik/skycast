import { useEffect, useLayoutEffect } from 'react'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Location from 'expo-location'
import { useLocationStore } from '@/src/store/locationStore'

/**
 * Web E2E: fixed coords. Checks `navigator.webdriver`, storage, URL, cookie, `extra`, and env.
 * When true, `useLocation` applies SF coords via `useLocationStore.setState` (bypasses manual-only `setLocation`).
 */
export function peekSkycastWebE2e(): boolean {
  try {
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { webdriver?: boolean }) : null
    if (nav?.webdriver === true) return true
    if (nav !== null && /HeadlessChrome|Playwright/i.test(nav.userAgent)) return true
  } catch {
    /* ignore */
  }
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('__skycast_e2e_web') === '1') {
      return true
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('__skycast_e2e_web') === '1') {
      return true
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof document !== 'undefined' && /(?:^|;\s*)__skycast_e2e_web=1(?:;|$)/.test(document.cookie)) {
      return true
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search)
      if (q.get('skycast_e2e') === '1') return true
    }
  } catch {
    /* ignore */
  }
  if (Platform.OS !== 'web') return false
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined
  if (extra?.skycastE2eWeb === true) return true
  if (process.env.EXPO_PUBLIC_SKYCAST_E2E_WEB === '1') return true
  const g = globalThis as unknown as Record<string, unknown>
  return g.__SKYCAST_E2E_WEB === true
}

interface UseLocationResult {
  loading: boolean
  error: string | null
  permissionDenied: boolean
}

/**
 * Call once from `LocationBootstrap` in `app/_layout.tsx`. Screens read
 * `locationLoading` / `locationError` / `locationPermissionDenied` from `useLocationStore`.
 */
export function useLocation(): UseLocationResult {
  const locationLoading = useLocationStore((s) => s.locationLoading)
  const locationError = useLocationStore((s) => s.locationError)
  const locationPermissionDenied = useLocationStore((s) => s.locationPermissionDenied)
  const setLocationUi = useLocationStore((s) => s.setLocationUi)

  const setLocation = useLocationStore((state) => state.setLocation)
  const recordDeviceLocation = useLocationStore((state) => state.recordDeviceLocation)
  const isManualSelection = useLocationStore((state) => state.isManualSelection)

  useLayoutEffect(() => {
    if (!peekSkycastWebE2e()) return
    // Bypass `setLocation` (it ignores updates while `isManualSelection` is true).
    useLocationStore.setState({
      lat: 37.7749,
      lon: -122.4194,
      cityName: 'San Francisco',
      deviceLat: 37.7749,
      deviceLon: -122.4194,
      deviceCityName: 'San Francisco',
      isManualSelection: false,
      locationLoading: false,
      locationError: null,
      locationPermissionDenied: false,
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchLocation(): Promise<void> {
      try {
        if (!cancelled) {
          setLocationUi({ locationPermissionDenied: false, locationError: null })
        }

        if (peekSkycastWebE2e()) {
          if (!cancelled) {
            useLocationStore.setState({
              lat: 37.7749,
              lon: -122.4194,
              cityName: 'San Francisco',
              deviceLat: 37.7749,
              deviceLon: -122.4194,
              deviceCityName: 'San Francisco',
              isManualSelection: false,
              locationLoading: false,
              locationError: null,
              locationPermissionDenied: false,
            })
          }
          return
        }

        if (isManualSelection) {
          if (!cancelled) {
            setLocationUi({ locationLoading: false })
          }
          return
        }

        const { status } = await Location.requestForegroundPermissionsAsync()

        if (status !== 'granted') {
          if (!cancelled) {
            setLocationUi({
              locationPermissionDenied: true,
              locationError: 'Location permission denied',
              locationLoading: false,
            })
          }
          return
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })

        const { latitude, longitude } = position.coords

        let geocodeResults: Awaited<ReturnType<typeof Location.reverseGeocodeAsync>> = []
        try {
          geocodeResults = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          })
        } catch {
          // Web: expo-location throws (no host geocoder). Native can still fail; continue with coords.
          geocodeResults = []
        }

        const place = geocodeResults[0]
        const cityName =
          place?.city ??
          place?.district ??
          place?.subregion ??
          place?.region ??
          'Your Location'

        if (!cancelled) {
          recordDeviceLocation(latitude, longitude, cityName)
          setLocation(latitude, longitude, cityName)
          setLocationUi({ locationPermissionDenied: false, locationError: null, locationLoading: false })
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to get location'
          setLocationUi({ locationError: message, locationLoading: false })
        }
      }
    }

    void fetchLocation()

    return () => {
      cancelled = true
    }
  }, [isManualSelection, recordDeviceLocation, setLocation, setLocationUi])

  return {
    loading: locationLoading,
    error: locationError,
    permissionDenied: locationPermissionDenied,
  }
}
