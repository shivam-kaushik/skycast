import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { fetchWeather } from '@/src/api/openMeteo'
import type { CurrentWeather, HourlyWeather, DailyWeather } from '@/src/types/weather'

const STALE_TIME = 5 * 60 * 1000
const REFETCH_INTERVAL = 10 * 60 * 1000
const RETRY = 2

export function useCurrentWeather(
  lat: number | null,
  lon: number | null,
): UseQueryResult<CurrentWeather> {
  return useQuery<CurrentWeather>({
    queryKey: ['weather', lat, lon],
    queryFn: async () => {
      const data = await fetchWeather(lat!, lon!)
      return data.current
    },
    enabled: lat !== null && lon !== null,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    retry: RETRY,
  })
}

export function useHourlyForecast(
  lat: number | null,
  lon: number | null,
): UseQueryResult<HourlyWeather> {
  return useQuery<HourlyWeather>({
    queryKey: ['weather', lat, lon],
    queryFn: async () => {
      const data = await fetchWeather(lat!, lon!)
      return data.hourly
    },
    enabled: lat !== null && lon !== null,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    retry: RETRY,
  })
}

export function useDailyForecast(
  lat: number | null,
  lon: number | null,
): UseQueryResult<DailyWeather> {
  return useQuery<DailyWeather>({
    queryKey: ['weather', lat, lon],
    queryFn: async () => {
      const data = await fetchWeather(lat!, lon!)
      return data.daily
    },
    enabled: lat !== null && lon !== null,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    retry: RETRY,
  })
}
