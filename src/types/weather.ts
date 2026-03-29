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
    alderPollen: number[]
    birchPollen: number[]
    grassPollen: number[]
    mugwortPollen: number[]
    olivePollen: number[]
    ragweedPollen: number[]
  }
}

export interface ActivityScore {
  score: number // 0-10
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Avoid'
  reason: string // 1 short sentence
  bestWindow?: string // e.g. "Best 7–10 AM"
  color: string // hex color for the score
}
