import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { fetchAirQuality } from '@/src/api/airQuality'
import type { AirQualityData } from '@/src/types/weather'

const STALE_TIME = 5 * 60 * 1000
const REFETCH_INTERVAL = 10 * 60 * 1000
const RETRY = 2

export function useAirQuality(
  lat: number | null,
  lon: number | null,
): UseQueryResult<AirQualityData> {
  return useQuery<AirQualityData>({
    queryKey: ['airQuality', lat, lon],
    queryFn: () => fetchAirQuality(lat!, lon!),
    enabled: lat !== null && lon !== null,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    retry: RETRY,
  })
}
