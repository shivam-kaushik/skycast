export interface CurrentWeather {
  temperature: number
  apparentTemperature: number
  humidity: number
  precipitationProbability: number
  weatherCode: number
  windSpeed: number
  windDirection: number
  windGusts: number
  pressure: number
  visibility: number
  uvIndex: number
  cloudCover: number
}

export interface HourlyWeather {
  time: string[]
  temperature: number[]
  apparentTemperature: number[]
  precipitationProbability: number[]
  precipitation: number[]
  weatherCode: number[]
  windSpeed: number[]
  windGusts: number[]
  uvIndex: number[]
  cloudCover: number[]
  visibility: number[]
  humidity: number[]
  surfacePressure: number[]
}

export interface DailyWeather {
  time: string[]
  tempMax: number[]
  tempMin: number[]
  weatherCode: number[]
  precipitationSum: number[]
  precipitationProbabilityMax: number[]
  windSpeedMax: number[]
  windGustsMax: number[]
  uvIndexMax: number[]
  sunrise: string[]
  sunset: string[]
}

/** Reanalysis daily series from Open-Meteo ERA5 (archive-api). */
export interface Era5DailyWeather {
  time: string[]
  tempMax: number[]
  tempMin: number[]
  precipitationSum: number[]
  windSpeedMax: number[]
}

export interface AirQualityData {
  current: {
    pm10: number
    pm25: number
    co: number
    no2: number
    ozone: number
    so2: number
    usAqi: number
    europeanAqi: number
  }
  hourly: {
    time: string[]
    pm10: number[]
    pm25: number[]
    no2: number[]
    ozone: number[]
    /** Open-Meteo uses `null` where the CAMS pollen model has no coverage. */
    alderPollen: (number | null)[]
    birchPollen: (number | null)[]
    grassPollen: (number | null)[]
    mugwortPollen: (number | null)[]
    olivePollen: (number | null)[]
    ragweedPollen: (number | null)[]
  }
}

export interface ActivityScore {
  score: number // 0-10
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Avoid'
  reason: string // 1 short sentence
  bestWindow?: string // e.g. "Best 7–10 AM"
  color: string // hex color for the score
}

export interface LunarData {
  phaseName: string
  illumination: number
  phaseAngle: number
  rise: Date | null
  set: Date | null
  nextFullMoon: Date
  nextNewMoon: Date
}

export interface RainbowWindow {
  likelyAt: Date
  faceDirection: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'
}

export interface SkyPhenomena {
  stargazingScore: number
  sunsetScore: number
  goldenHourStart: Date
  goldenHourEnd: Date
  goldenHourQuality: 'Excellent' | 'Good' | 'Fair'
  rainbowWindow: RainbowWindow | null
}

export interface RainSegment {
  probability: number
  time: Date
}

export interface PressureAlertData {
  alert: boolean
  delta: number
  direction: 'rising' | 'falling'
  windowStart: number
}

export interface AllergyRiskData {
  label: 'Low' | 'Moderate' | 'High' | 'Very High'
  score: number
  dominantAllergen: string | null
}

export interface WeatherAlert {
  id: string
  title: string
  description: string
  severity: 'moderate' | 'severe' | 'extreme'
  source: 'nws' | 'weathercode' | 'precipitation'
  geometry: { type: 'Polygon'; coordinates: number[][][] } | null
}
