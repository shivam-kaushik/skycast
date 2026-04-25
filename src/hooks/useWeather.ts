import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { fetchWeather } from '@/src/api/openMeteo'
import type { CurrentWeather, HourlyWeather, DailyWeather } from '@/src/types/weather'
import { usePremiumStore } from '@/src/store/premiumStore'

const STALE_TIME = 5 * 60 * 1000
const REFETCH_INTERVAL_FREE = 10 * 60 * 1000
const REFETCH_INTERVAL_PREMIUM = 5 * 60 * 1000
const RETRY = 2

export interface WeatherData {
  current: CurrentWeather
  hourly: HourlyWeather
  daily: DailyWeather
}

export function useWeather(
  lat: number | null,
  lon: number | null,
): UseQueryResult<WeatherData> {
  const isPremium = usePremiumStore((s) => s.isPremium)
  return useQuery<WeatherData>({
    queryKey: ['weather', lat, lon],
    queryFn: () => fetchWeather(lat!, lon!),
    enabled: lat !== null && lon !== null,
    staleTime: STALE_TIME,
    refetchInterval: isPremium ? REFETCH_INTERVAL_PREMIUM : REFETCH_INTERVAL_FREE,
    retry: RETRY,
  })
}
