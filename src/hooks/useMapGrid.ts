import { useQuery } from '@tanstack/react-query'
import { fetchMapGrid, type MapGridPoint } from '@/src/api/mapGrid'

export function useMapGrid(lat: number | null, lon: number | null) {
  return useQuery<MapGridPoint[]>({
    queryKey: ['mapGrid', lat, lon],
    queryFn: () => fetchMapGrid(lat!, lon!),
    enabled: lat !== null && lon !== null,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: 1,
  })
}