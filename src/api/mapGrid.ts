import { logger } from '@/src/utils/logger'

export interface MapGridPoint {
  latitude: number
  longitude: number
  temperature: number
  precipitationProbability: number
  cloudCover: number
  windSpeed: number
  windDirection: number
  windGusts: number
  usAqi: number
}

interface ForecastPointResponse {
  latitude: number
  longitude: number
  current: {
    temperature_2m: number
    precipitation_probability: number
    cloud_cover: number
    windspeed_10m: number
    winddirection_10m: number
    windgusts_10m: number
  }
}

interface AirPointResponse {
  current: {
    us_aqi: number
  }
}

function buildGridCoordinates(lat: number, lon: number): { latitudes: number[]; longitudes: number[] } {
  const latOffsets = [-0.8, -0.4, 0, 0.4, 0.8]
  const lonOffsets = [-1, -0.5, 0, 0.5, 1]
  const latitudes: number[] = []
  const longitudes: number[] = []

  for (const latOffset of latOffsets) {
    for (const lonOffset of lonOffsets) {
      latitudes.push(lat + latOffset)
      longitudes.push(lon + lonOffset)
    }
  }

  return { latitudes, longitudes }
}

export async function fetchMapGrid(lat: number, lon: number): Promise<MapGridPoint[]> {
  const { latitudes, longitudes } = buildGridCoordinates(lat, lon)
  const coordinateParams = {
    latitude: latitudes.join(','),
    longitude: longitudes.join(','),
    timezone: 'auto',
  }
  const forecastParams = new URLSearchParams({
    ...coordinateParams,
    current: [
      'temperature_2m',
      'precipitation_probability',
      'cloud_cover',
      'windspeed_10m',
      'winddirection_10m',
      'windgusts_10m',
    ].join(','),
  })
  const airParams = new URLSearchParams({ ...coordinateParams, current: 'us_aqi' })
  const forecastUrl = `https://api.open-meteo.com/v1/forecast?${forecastParams.toString()}`
  const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?${airParams.toString()}`

  try {
    const [forecastResponse, airResponse] = await Promise.all([
      fetch(forecastUrl),
      fetch(airUrl),
    ])
    if (!forecastResponse.ok) throw new Error(`Map forecast API error: ${forecastResponse.status}`)
    if (!airResponse.ok) throw new Error(`Map air API error: ${airResponse.status}`)

    const forecasts = (await forecastResponse.json()) as ForecastPointResponse[]
    const airPoints = (await airResponse.json()) as AirPointResponse[]
    const grid = forecasts.map((point, index): MapGridPoint => ({
      latitude: point.latitude,
      longitude: point.longitude,
      temperature: point.current.temperature_2m,
      precipitationProbability: point.current.precipitation_probability,
      cloudCover: point.current.cloud_cover,
      windSpeed: point.current.windspeed_10m,
      windDirection: point.current.winddirection_10m,
      windGusts: point.current.windgusts_10m,
      usAqi: airPoints[index]?.current.us_aqi ?? 0,
    }))
    logger.info('map.grid', 'spatial map data loaded', { points: grid.length, lat, lon })
    return grid
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown map grid failure')
    logger.error('map.grid', err.message, { lat, lon })
    throw err
  }
}