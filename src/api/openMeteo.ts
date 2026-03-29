import type { CurrentWeather, HourlyWeather, DailyWeather } from '@/src/types/weather'

interface OpenMeteoCurrentRaw {
  temperature_2m: number
  apparent_temperature: number
  relative_humidity_2m: number
  precipitation_probability: number
  weathercode: number
  windspeed_10m: number
  winddirection_10m: number
  windgusts_10m: number
  surface_pressure: number
  visibility: number
  uv_index: number
  cloud_cover: number
}

interface OpenMeteoHourlyRaw {
  time: string[]
  temperature_2m: number[]
  apparent_temperature: number[]
  precipitation_probability: number[]
  precipitation: number[]
  weathercode: number[]
  windspeed_10m: number[]
  windgusts_10m: number[]
  uv_index: number[]
  cloud_cover: number[]
  visibility: number[]
  relativehumidity_2m: number[]
}

interface OpenMeteoDailyRaw {
  time: string[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  weathercode: number[]
  precipitation_sum: number[]
  precipitation_probability_max: number[]
  windspeed_10m_max: number[]
  windgusts_10m_max: number[]
  uv_index_max: number[]
  sunrise: string[]
  sunset: string[]
}

interface OpenMeteoResponse {
  current: OpenMeteoCurrentRaw
  hourly: OpenMeteoHourlyRaw
  daily: OpenMeteoDailyRaw
}

interface WeatherData {
  current: CurrentWeather
  hourly: HourlyWeather
  daily: DailyWeather
}

function mapCurrent(raw: OpenMeteoCurrentRaw): CurrentWeather {
  return {
    temperature: raw.temperature_2m,
    apparentTemperature: raw.apparent_temperature,
    humidity: raw.relative_humidity_2m,
    precipitationProbability: raw.precipitation_probability,
    weatherCode: raw.weathercode,
    windSpeed: raw.windspeed_10m,
    windDirection: raw.winddirection_10m,
    windGusts: raw.windgusts_10m,
    pressure: raw.surface_pressure,
    visibility: raw.visibility / 1000, // API returns meters, we use km
    uvIndex: raw.uv_index,
    cloudCover: raw.cloud_cover,
  }
}

function mapHourly(raw: OpenMeteoHourlyRaw): HourlyWeather {
  return {
    time: raw.time,
    temperature: raw.temperature_2m,
    apparentTemperature: raw.apparent_temperature,
    precipitationProbability: raw.precipitation_probability,
    precipitation: raw.precipitation,
    weatherCode: raw.weathercode,
    windSpeed: raw.windspeed_10m,
    windGusts: raw.windgusts_10m,
    uvIndex: raw.uv_index,
    cloudCover: raw.cloud_cover,
    visibility: raw.visibility.map((v) => v / 1000), // meters to km
    humidity: raw.relativehumidity_2m,
  }
}

function mapDaily(raw: OpenMeteoDailyRaw): DailyWeather {
  return {
    time: raw.time,
    tempMax: raw.temperature_2m_max,
    tempMin: raw.temperature_2m_min,
    weatherCode: raw.weathercode,
    precipitationSum: raw.precipitation_sum,
    precipitationProbabilityMax: raw.precipitation_probability_max,
    windSpeedMax: raw.windspeed_10m_max,
    windGustsMax: raw.windgusts_10m_max,
    uvIndexMax: raw.uv_index_max,
    sunrise: raw.sunrise,
    sunset: raw.sunset,
  }
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation_probability',
      'weathercode',
      'windspeed_10m',
      'winddirection_10m',
      'windgusts_10m',
      'surface_pressure',
      'visibility',
      'uv_index',
      'cloud_cover',
    ].join(','),
    hourly: [
      'temperature_2m',
      'apparent_temperature',
      'precipitation_probability',
      'precipitation',
      'weathercode',
      'windspeed_10m',
      'windgusts_10m',
      'uv_index',
      'cloud_cover',
      'visibility',
      'relativehumidity_2m',
    ].join(','),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'weathercode',
      'precipitation_sum',
      'precipitation_probability_max',
      'windspeed_10m_max',
      'windgusts_10m_max',
      'uv_index_max',
      'sunrise',
      'sunset',
    ].join(','),
    forecast_days: '14',
    timezone: 'auto',
  })

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as OpenMeteoResponse

  return {
    current: mapCurrent(data.current),
    hourly: mapHourly(data.hourly),
    daily: mapDaily(data.daily),
  }
}
