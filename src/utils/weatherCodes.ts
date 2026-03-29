interface WeatherCodeInfo {
  label: string
  ionicon: string
}

const weatherCodeMap: Record<number, WeatherCodeInfo> = {
  0: { label: 'Clear Sky', ionicon: 'sunny' },
  1: { label: 'Mainly Clear', ionicon: 'sunny' },
  2: { label: 'Partly Cloudy', ionicon: 'partly-sunny' },
  3: { label: 'Overcast', ionicon: 'cloudy' },
  45: { label: 'Foggy', ionicon: 'cloud' },
  48: { label: 'Icy Fog', ionicon: 'cloud' },
  51: { label: 'Light Drizzle', ionicon: 'rainy' },
  53: { label: 'Moderate Drizzle', ionicon: 'rainy' },
  55: { label: 'Dense Drizzle', ionicon: 'rainy' },
  61: { label: 'Slight Rain', ionicon: 'rainy' },
  63: { label: 'Moderate Rain', ionicon: 'rainy' },
  65: { label: 'Heavy Rain', ionicon: 'rainy' },
  71: { label: 'Slight Snow', ionicon: 'snow' },
  73: { label: 'Moderate Snow', ionicon: 'snow' },
  75: { label: 'Heavy Snow', ionicon: 'snow' },
  77: { label: 'Snow Grains', ionicon: 'snow' },
  80: { label: 'Slight Showers', ionicon: 'rainy' },
  81: { label: 'Moderate Showers', ionicon: 'rainy' },
  82: { label: 'Violent Showers', ionicon: 'thunderstorm' },
  85: { label: 'Slight Snow Showers', ionicon: 'snow' },
  86: { label: 'Heavy Snow Showers', ionicon: 'snow' },
  95: { label: 'Thunderstorm', ionicon: 'thunderstorm' },
  96: { label: 'Thunderstorm with Hail', ionicon: 'thunderstorm' },
  99: { label: 'Thunderstorm with Heavy Hail', ionicon: 'thunderstorm' },
}

export function getWeatherCodeInfo(code: number): WeatherCodeInfo {
  return weatherCodeMap[code] ?? { label: 'Unknown', ionicon: 'cloudy' }
}

export default weatherCodeMap
