import type { AirQualityData } from '@/src/types/weather'

interface AirQualityCurrentRaw {
  pm10: number
  pm2_5: number
  carbon_monoxide: number
  nitrogen_dioxide: number
  ozone: number
  sulphur_dioxide: number
  us_aqi: number
  european_aqi: number
}

interface AirQualityHourlyRaw {
  time: string[]
  pm10: number[]
  pm2_5: number[]
  nitrogen_dioxide: number[]
  ozone: number[]
  alder_pollen: number[]
  birch_pollen: number[]
  grass_pollen: number[]
  mugwort_pollen: number[]
  olive_pollen: number[]
  ragweed_pollen: number[]
}

interface AirQualityApiResponse {
  current: AirQualityCurrentRaw
  hourly: AirQualityHourlyRaw
}

export async function fetchAirQuality(lat: number, lon: number): Promise<AirQualityData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: [
      'pm10',
      'pm2_5',
      'carbon_monoxide',
      'nitrogen_dioxide',
      'ozone',
      'sulphur_dioxide',
      'us_aqi',
      'european_aqi',
    ].join(','),
    hourly: [
      'pm10',
      'pm2_5',
      'nitrogen_dioxide',
      'ozone',
      'alder_pollen',
      'birch_pollen',
      'grass_pollen',
      'mugwort_pollen',
      'olive_pollen',
      'ragweed_pollen',
    ].join(','),
    timezone: 'auto',
  })

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?${params.toString()}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Air quality API error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as AirQualityApiResponse

  return {
    current: {
      pm10: data.current.pm10,
      pm25: data.current.pm2_5,
      co: data.current.carbon_monoxide,
      no2: data.current.nitrogen_dioxide,
      ozone: data.current.ozone,
      so2: data.current.sulphur_dioxide,
      usAqi: data.current.us_aqi,
      europeanAqi: data.current.european_aqi,
    },
    hourly: {
      time: data.hourly.time,
      pm10: data.hourly.pm10,
      pm25: data.hourly.pm2_5,
      no2: data.hourly.nitrogen_dioxide,
      ozone: data.hourly.ozone,
      alderPollen: data.hourly.alder_pollen,
      birchPollen: data.hourly.birch_pollen,
      grassPollen: data.hourly.grass_pollen,
      mugwortPollen: data.hourly.mugwort_pollen,
      olivePollen: data.hourly.olive_pollen,
      ragweedPollen: data.hourly.ragweed_pollen,
    },
  }
}
