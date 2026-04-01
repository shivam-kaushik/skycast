import { useEffect, useState } from 'react'
import * as Location from 'expo-location'
import { useLocationStore } from '@/src/store/locationStore'

interface UseLocationResult {
  loading: boolean
  error: string | null
  permissionDenied: boolean
}

export function useLocation(): UseLocationResult {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)

  const setLocation = useLocationStore((state) => state.setLocation)
  const recordDeviceLocation = useLocationStore((state) => state.recordDeviceLocation)
  const isManualSelection = useLocationStore((state) => state.isManualSelection)

  useEffect(() => {
    let cancelled = false

    async function fetchLocation(): Promise<void> {
      try {
        if (!cancelled) {
          setPermissionDenied(false)
          setError(null)
        }

        if (isManualSelection) {
          if (!cancelled) {
            setLoading(false)
          }
          return
        }

        const { status } = await Location.requestForegroundPermissionsAsync()

        if (status !== 'granted') {
          if (!cancelled) {
            setPermissionDenied(true)
            setError('Location permission denied')
            setLoading(false)
          }
          return
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })

        const { latitude, longitude } = position.coords

        const geocodeResults = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        })

        const place = geocodeResults[0]
        const cityName =
          place?.city ??
          place?.district ??
          place?.subregion ??
          place?.region ??
          'Unknown Location'

        if (!cancelled) {
          recordDeviceLocation(latitude, longitude, cityName)
          setLocation(latitude, longitude, cityName)
          setPermissionDenied(false)
          setError(null)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to get location'
          setError(message)
          setLoading(false)
        }
      }
    }

    void fetchLocation()

    return () => {
      cancelled = true
    }
  }, [isManualSelection, recordDeviceLocation, setLocation])

  return { loading, error, permissionDenied }
}
