import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { fetchEra5Daily } from '@/src/api/archiveWeather'
import type { Era5DailyWeather } from '@/src/types/weather'

const STALE_TIME = 6 * 60 * 60 * 1000
const RETRY = 2

/** ERA5 on Open-Meteo is several days behind realtime; keep end date safely in the past. */
const ERA5_LAG_DAYS = 5
const HISTORY_DAY_COUNT = 7

function era5DateRange(): { start: string; end: string } {
  const end = subDays(new Date(), ERA5_LAG_DAYS)
  const start = subDays(end, HISTORY_DAY_COUNT - 1)
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  }
}

export function useEra5History(
  lat: number | null,
  lon: number | null,
): UseQueryResult<Era5DailyWeather> {
  const { start, end } = era5DateRange()
  return useQuery<Era5DailyWeather>({
    queryKey: ['era5', lat, lon, start, end],
    queryFn: () => fetchEra5Daily(lat!, lon!, start, end),
    enabled: lat !== null && lon !== null,
    staleTime: STALE_TIME,
    retry: RETRY,
  })
}
