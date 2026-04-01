import type { Era5DailyWeather } from '@/src/types/weather'

interface Era5DailyRaw {
  time: string[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  precipitation_sum: number[]
  windspeed_10m_max: number[]
}

interface Era5ApiResponse {
  daily: Era5DailyRaw
}

function mapDaily(raw: Era5DailyRaw): Era5DailyWeather {
  return {
    time: raw.time,
    tempMax: raw.temperature_2m_max,
    tempMin: raw.temperature_2m_min,
    precipitationSum: raw.precipitation_sum,
    windSpeedMax: raw.windspeed_10m_max,
  }
}

/**
 * @see https://open-meteo.com/en/docs/historical-weather-api — ERA5 lags realtime by several days.
 */
export async function fetchEra5Daily(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string,
): Promise<Era5DailyWeather> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    start_date: startDate,
    end_date: endDate,
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'windspeed_10m_max',
    ].join(','),
    timezone: 'auto',
  })

  const url = `https://archive-api.open-meteo.com/v1/era5?${params.toString()}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`ERA5 API error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as Era5ApiResponse
  return mapDaily(data.daily)
}
