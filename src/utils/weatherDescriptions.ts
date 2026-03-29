import { GOOD, WARNING, DANGER, ACCENT } from '@/src/theme/colors'

export function describeHumidity(percent: number): string {
  if (percent <= 10) return 'Very dry — consider using a humidifier'
  if (percent <= 25) return 'Dry air — stay hydrated'
  if (percent <= 40) return 'Comfortable and fresh'
  if (percent <= 60) return 'Comfortable humidity'
  if (percent <= 75) return 'Slightly humid'
  if (percent <= 85) return 'Humid and muggy'
  return 'Oppressive humidity — feels heavy outdoors'
}

export function describeWind(kmh: number): string {
  if (kmh < 1) return 'Calm — still air'
  if (kmh < 12) return 'Light breeze — barely noticeable'
  if (kmh < 20) return 'Gentle breeze — pleasant outdoors'
  if (kmh < 30) return 'Breezy — light jacket recommended'
  if (kmh < 40) return 'Moderate wind — hold onto loose items'
  if (kmh < 55) return 'Strong wind — outdoor activities affected'
  if (kmh < 75) return 'Very strong wind — use caution outdoors'
  if (kmh < 90) return 'Stormy wind — dangerous conditions'
  return 'Violent storm — stay indoors'
}

export function describeUV(index: number): string {
  if (index <= 2) return 'Low UV — minimal protection needed'
  if (index <= 5) return 'Moderate UV — wear sunscreen'
  if (index <= 7) return 'High UV — sunscreen and hat recommended'
  if (index <= 10) return 'Very high UV — limit midday sun exposure'
  return 'Extreme UV — avoid direct sun, full protection essential'
}

export function describePressure(
  hpa: number,
  trend: 'rising' | 'falling' | 'steady',
): string {
  const trendDesc =
    trend === 'rising'
      ? 'Rising pressure — weather is improving'
      : trend === 'falling'
        ? 'Falling pressure — conditions may deteriorate'
        : 'Pressure is stable'

  if (hpa < 1000) return `${trendDesc}; low pressure system overhead`
  if (hpa < 1013) return `${trendDesc}; slightly below average`
  if (hpa < 1025) return `${trendDesc}; normal conditions`
  return `${trendDesc}; high pressure bringing settled weather`
}

export function describeVisibility(km: number): string {
  if (km < 0.5) return 'Dense fog — near zero visibility, avoid driving'
  if (km < 1) return 'Very poor visibility — fog or heavy precipitation'
  if (km < 4) return 'Reduced visibility — fog patches or mist'
  if (km < 10) return 'Moderate visibility — some haze'
  if (km < 20) return 'Good visibility — clear conditions'
  return 'Excellent visibility — crystal clear skies'
}

export function describeAQI(aqi: number): {
  label: string
  color: string
  advice: string
} {
  if (aqi <= 50) {
    return {
      label: 'Good',
      color: GOOD,
      advice: 'Air quality is satisfactory — enjoy outdoor activities.',
    }
  }
  if (aqi <= 100) {
    return {
      label: 'Moderate',
      color: WARNING,
      advice: 'Acceptable air quality — sensitive individuals should limit prolonged outdoor exertion.',
    }
  }
  if (aqi <= 150) {
    return {
      label: 'Unhealthy for Sensitive Groups',
      color: '#FF9500',
      advice: 'Sensitive groups should reduce prolonged outdoor activity.',
    }
  }
  if (aqi <= 200) {
    return {
      label: 'Unhealthy',
      color: DANGER,
      advice: 'Everyone may begin to experience health effects — limit outdoor time.',
    }
  }
  if (aqi <= 300) {
    return {
      label: 'Very Unhealthy',
      color: '#C0392B',
      advice: 'Health alert — everyone should avoid prolonged outdoor exertion.',
    }
  }
  return {
    label: 'Hazardous',
    color: '#7D3C98',
    advice: 'Emergency conditions — avoid all outdoor activity.',
  }
}

export function describePollenLevel(
  count: number | null,
): 'None' | 'Low' | 'Moderate' | 'High' | 'Very High' {
  if (count === null || count === 0) return 'None'
  if (count <= 10) return 'Low'
  if (count <= 50) return 'Moderate'
  if (count <= 100) return 'High'
  return 'Very High'
}
