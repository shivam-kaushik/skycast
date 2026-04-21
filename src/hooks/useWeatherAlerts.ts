import { useQuery } from '@tanstack/react-query'
import type { WeatherAlert } from '@/src/types/weather'

interface NWSProperties {
  headline: string
  description: string
  severity: string
  event: string
}

interface NWSFeature {
  id: string
  properties: NWSProperties
  geometry: { type: string; coordinates: number[][][] } | null
}

interface NWSResponse {
  features: NWSFeature[]
}

async function fetchNWSAlerts(lat: number, lon: number): Promise<WeatherAlert[]> {
  const url = `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Skycast/1.0 (contact@skycast.app)' },
  })
  if (!res.ok) return []
  const data = (await res.json()) as NWSResponse
  return (data.features ?? []).map((f) => ({
    id: f.id,
    title: f.properties.event,
    description: f.properties.headline,
    severity:
      f.properties.severity === 'Extreme'
        ? ('extreme' as const)
        : f.properties.severity === 'Severe'
          ? ('severe' as const)
          : ('moderate' as const),
    source: 'nws' as const,
    geometry:
      f.geometry?.type === 'Polygon'
        ? (f.geometry as WeatherAlert['geometry'])
        : null,
  }))
}

export function useWeatherAlerts(
  lat: number | null,
  lon: number | null,
  weatherCode?: number,
  precipProbability?: number,
): WeatherAlert[] {
  const { data: nwsAlerts = [] } = useQuery<WeatherAlert[]>({
    queryKey: ['nwsAlerts', lat, lon],
    queryFn: () => fetchNWSAlerts(lat!, lon!),
    enabled: lat !== null && lon !== null,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const localAlerts: WeatherAlert[] = []

  if (weatherCode !== undefined && weatherCode >= 95) {
    localAlerts.push({
      id: 'local-thunderstorm',
      title: 'Thunderstorm Alert',
      description: 'Thunderstorm or severe hail detected in your area.',
      severity: 'severe',
      source: 'weathercode',
      geometry: null,
    })
  }

  if (
    precipProbability !== undefined &&
    precipProbability > 85 &&
    weatherCode !== undefined &&
    weatherCode >= 65 &&
    weatherCode <= 67
  ) {
    localAlerts.push({
      id: 'local-heavy-rain',
      title: 'Heavy Rain Warning',
      description: 'High chance of heavy rain in the next hour.',
      severity: 'moderate',
      source: 'precipitation',
      geometry: null,
    })
  }

  return [...localAlerts, ...nwsAlerts]
}
