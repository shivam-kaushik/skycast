export interface LocationSearchResult {
  id: string
  cityName: string
  lat: number
  lon: number
  country?: string
  admin1?: string
}

interface OpenMeteoGeocodeResult {
  id?: number
  name?: string
  latitude?: number
  longitude?: number
  country?: string
  admin1?: string
}

interface OpenMeteoGeocodeResponse {
  results?: OpenMeteoGeocodeResult[]
}

interface MapsCoResult {
  display_name?: string
  lat?: string
  lon?: string
}

function dedupeResults(results: LocationSearchResult[]): LocationSearchResult[] {
  const seen = new Set<string>()
  const out: LocationSearchResult[] = []
  for (const entry of results) {
    const key = `${entry.cityName.toLowerCase()}|${entry.lat.toFixed(3)}|${entry.lon.toFixed(3)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(entry)
  }
  return out
}

async function searchOpenMeteo(query: string): Promise<LocationSearchResult[]> {
  const endpoint = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`
  const response = await fetch(endpoint)
  if (!response.ok) {
    throw new Error(`Open-Meteo search failed (${response.status})`)
  }
  const json = (await response.json()) as OpenMeteoGeocodeResponse
  const results = Array.isArray(json.results) ? json.results : []
  return results
    .filter(
      (
        item,
      ): item is Required<Pick<OpenMeteoGeocodeResult, 'latitude' | 'longitude' | 'name'>> &
        OpenMeteoGeocodeResult =>
        typeof item.latitude === 'number' &&
        typeof item.longitude === 'number' &&
        typeof item.name === 'string',
    )
    .map((item) => ({
      id: String(item.id ?? `${item.name}-${item.latitude}-${item.longitude}`),
      cityName: item.name,
      lat: item.latitude,
      lon: item.longitude,
      country: item.country,
      admin1: item.admin1,
    }))
}

async function searchMapsCo(query: string): Promise<LocationSearchResult[]> {
  const endpoint = `https://geocode.maps.co/search?q=${encodeURIComponent(query)}&limit=10`
  const response = await fetch(endpoint)
  if (!response.ok) {
    throw new Error(`Maps.co search failed (${response.status})`)
  }
  const json = (await response.json()) as unknown
  const rows = Array.isArray(json) ? (json as MapsCoResult[]) : []
  const mapped: Array<LocationSearchResult | null> = rows.map((item) => {
      const lat = Number(item.lat)
      const lon = Number(item.lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
      const display = String(item.display_name ?? '').trim()
      if (!display) return null
      const parts = display.split(',').map((p) => p.trim())
      const cityName = parts[0] ?? 'Unknown'
      const country = parts[parts.length - 1]
      const admin1 = parts.length > 2 ? parts[parts.length - 3] : undefined
      return {
        id: `mapsco-${cityName}-${lat}-${lon}`,
        cityName,
        lat,
        lon,
        country,
        admin1,
      }
    })
  return mapped.filter((item): item is LocationSearchResult => item !== null)
}

export async function searchLocations(query: string): Promise<LocationSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  try {
    const primary = await searchOpenMeteo(trimmed)
    if (primary.length > 0) {
      return dedupeResults(primary)
    }
  } catch (_) {
    // Fallback handled below.
  }

  const fallback = await searchMapsCo(trimmed)
  return dedupeResults(fallback)
}
