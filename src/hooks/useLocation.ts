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

  useEffect(() => {
    let cancelled = false

    async function fetchLocation(): Promise<void> {
      try {
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
          setLocation(latitude, longitude, cityName)
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
  }, [setLocation])

  return { loading, error, permissionDenied }
}
