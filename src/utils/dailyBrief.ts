import type { CurrentWeather, HourlyWeather } from '@/src/types/weather'

const RAIN_THRESHOLD = 60 // % probability
const UV_THRESHOLD = 7
const WIND_THRESHOLD = 50 // km/h

/** Returns hour (0-23) from an ISO datetime string like "2024-06-15T14:00" */
function getHour(timeStr: string): number {
  const match = timeStr.match(/T(\d{2}):/)
  return match ? parseInt(match[1], 10) : 0
}

function formatHour(hour: number): string {
  if (hour === 0) return 'midnight'
  if (hour === 12) return 'noon'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

function describeTimeRange(startHour: number, endHour: number): string {
  if (startHour <= 6) return 'early morning'
  if (startHour <= 9) return 'morning'
  if (startHour <= 12) return 'late morning'
  if (startHour <= 14) return 'midday'
  if (startHour <= 17) return 'afternoon'
  if (startHour <= 20) return 'evening'
  return 'tonight'
}

function describeDuration(durationHours: number): string {
  if (durationHours <= 1) return 'brief shower'
  if (durationHours <= 3) return 'a few hours'
  if (durationHours <= 6) return 'much of the day'
  return 'most of the day'
}

const CLEAR_SUGGESTIONS = [
  'great day for a walk',
  'perfect for outdoor exercise',
  'ideal for exploring outdoors',
  'good day to enjoy the fresh air',
  'great conditions for cycling',
]

export function generateDailyBrief(
  current: CurrentWeather,
  hourly: HourlyWeather,
): string {
  const parts: string[] = []

  // Find rain windows — hours where precipitationProbability > threshold
  const rainHours = hourly.time
    .map((t, i) => ({ hour: getHour(t), prob: hourly.precipitationProbability[i] ?? 0 }))
    .filter(({ prob }) => prob > RAIN_THRESHOLD)

  const hasRain = rainHours.length > 0

  if (hasRain) {
    const firstRainHour = rainHours[0]?.hour ?? 12
    const lastRainHour = rainHours[rainHours.length - 1]?.hour ?? firstRainHour
    const timeRange = describeTimeRange(firstRainHour, lastRainHour)
    const duration = describeDuration(lastRainHour - firstRainHour + 1)
    parts.push(`Rain expected ${timeRange} — ${duration}.`)
  } else {
    // Clear all day
    const suggestion = CLEAR_SUGGESTIONS[new Date().getDay() % CLEAR_SUGGESTIONS.length] ?? 'enjoy the outdoors'
    parts.push(`Clear skies all day — ${suggestion}.`)
  }

  // Check max UV across the day
  const maxUV = Math.max(...hourly.uvIndex, current.uvIndex)
  // Check max wind across the day
  const maxWind = Math.max(...hourly.windSpeed, current.windSpeed)

  const warnings: string[] = []

  if (maxUV > UV_THRESHOLD) {
    warnings.push('Strong UV — sun protection essential')
  }
  if (maxWind > WIND_THRESHOLD) {
    warnings.push('Strong wind gusts expected')
  }

  if (warnings.length > 0) {
    parts.push(warnings.join('; ') + '.')
  }

  const brief = parts.join(' ')

  // Enforce 180 char limit by trimming the last part if needed
  if (brief.length <= 180) return brief

  // If over limit, try with just the first sentence
  const firstSentence = parts[0] ?? ''
  if (firstSentence.length <= 180) return firstSentence

  return firstSentence.slice(0, 177) + '...'
}
