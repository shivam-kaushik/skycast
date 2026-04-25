import type { HourlyWeather, DailyWeather, ActivityScore } from '@/src/types/weather'
import { GOOD, WARNING, DANGER } from '@/src/theme/colors'

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function scoreToLabel(score: number): ActivityScore['label'] {
  if (score >= 9) return 'Excellent'
  if (score >= 7) return 'Good'
  if (score >= 5) return 'Fair'
  if (score >= 3) return 'Poor'
  return 'Avoid'
}

function scoreToColor(score: number): string {
  if (score >= 7) return GOOD
  if (score >= 5) return WARNING
  return DANGER
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Filter hourly indices that fall on targetDate */
function getDateIndices(hourly: HourlyWeather, targetDate: string): number[] {
  return hourly.time.reduce<number[]>((acc, t, i) => {
    if (t.startsWith(targetDate)) acc.push(i)
    return acc
  }, [])
}

/** Get hour number from ISO time string */
function getHour(timeStr: string): number {
  const match = timeStr.match(/T(\d{2}):/)
  return match ? parseInt(match[1], 10) : 0
}

/** Find best N-hour window with lowest combined precip+wind for daytime */
function findBestWindow(
  hourly: HourlyWeather,
  indices: number[],
  daytimeStart = 6,
  daytimeEnd = 20,
): string | undefined {
  const daytimeIndices = indices.filter((i) => {
    const h = getHour(hourly.time[i] ?? '')
    return h >= daytimeStart && h <= daytimeEnd
  })
  if (daytimeIndices.length === 0) return undefined

  let bestStart = daytimeIndices[0] ?? 0
  let bestScore = Infinity

  for (let j = 0; j < daytimeIndices.length - 2; j++) {
    const idx = daytimeIndices[j]
    if (idx === undefined) continue
    const window3 = daytimeIndices.slice(j, j + 3)
    const windowScore = window3.reduce((sum, wi) => {
      return sum + (hourly.precipitationProbability[wi] ?? 0) + (hourly.windSpeed[wi] ?? 0)
    }, 0)
    if (windowScore < bestScore) {
      bestScore = windowScore
      bestStart = idx
    }
  }

  const startHour = getHour(hourly.time[bestStart] ?? '')
  const endHour = startHour + 3
  const fmt = (h: number) => (h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`)
  return `Best ${fmt(startHour)}–${fmt(endHour)}`
}

function makeScore(
  rawScore: number,
  reason: string,
  bestWindow?: string,
): ActivityScore {
  const score = clamp(Math.round(rawScore), 0, 10)
  return {
    score,
    label: scoreToLabel(score),
    reason,
    bestWindow,
    color: scoreToColor(score),
  }
}

// ─── Base scoring logic ───────────────────────────────────────────────────────

interface HourlyStats {
  avgPrecipProb: number
  maxPrecipProb: number
  avgWindSpeed: number
  maxWindSpeed: number
  avgTemp: number
  maxTemp: number
  minTemp: number
  avgUV: number
  maxUV: number
  avgCloudCover: number
  hasThunderstorm: boolean
}

function computeStats(hourly: HourlyWeather, indices: number[]): HourlyStats {
  if (indices.length === 0) {
    return {
      avgPrecipProb: 0, maxPrecipProb: 0,
      avgWindSpeed: 0, maxWindSpeed: 0,
      avgTemp: 20, maxTemp: 25, minTemp: 15,
      avgUV: 3, maxUV: 5,
      avgCloudCover: 20,
      hasThunderstorm: false,
    }
  }

  const precipProbs = indices.map((i) => hourly.precipitationProbability[i] ?? 0)
  const winds = indices.map((i) => hourly.windSpeed[i] ?? 0)
  const temps = indices.map((i) => hourly.temperature[i] ?? 20)
  const uvs = indices.map((i) => hourly.uvIndex[i] ?? 0)
  const clouds = indices.map((i) => hourly.cloudCover[i] ?? 0)
  const codes = indices.map((i) => hourly.weatherCode[i] ?? 0)

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length

  return {
    avgPrecipProb: avg(precipProbs),
    maxPrecipProb: Math.max(...precipProbs),
    avgWindSpeed: avg(winds),
    maxWindSpeed: Math.max(...winds),
    avgTemp: avg(temps),
    maxTemp: Math.max(...temps),
    minTemp: Math.min(...temps),
    avgUV: avg(uvs),
    maxUV: Math.max(...uvs),
    avgCloudCover: avg(clouds),
    hasThunderstorm: codes.some((c) => c === 95 || c === 96 || c === 99),
  }
}

// ─── Activity scorers ─────────────────────────────────────────────────────────

export function scoreRunning(
  hourly: HourlyWeather,
  daily: DailyWeather,
  targetDate: string,
): ActivityScore {
  const indices = getDateIndices(hourly, targetDate)
  const s = computeStats(hourly, indices)

  if (s.hasThunderstorm) return makeScore(1, 'Thunderstorm — unsafe for running')

  let score = 10
  // Rain penalty
  if (s.maxPrecipProb > 80) score -= 5
  else if (s.maxPrecipProb > 60) score -= 3
  else if (s.maxPrecipProb > 40) score -= 1

  // Wind penalty
  if (s.maxWindSpeed > 50) score -= 3
  else if (s.maxWindSpeed > 35) score -= 2
  else if (s.maxWindSpeed > 25) score -= 1

  // Temperature penalty
  if (s.maxTemp > 35) score -= 3
  else if (s.maxTemp > 30) score -= 1
  if (s.minTemp < 0) score -= 2

  // UV penalty
  if (s.maxUV > 9) score -= 2
  else if (s.maxUV > 7) score -= 1

  const bestWindow = score >= 5 ? findBestWindow(hourly, indices, 6, 10) : undefined

  const reasons: Record<number, string> = {
    9: 'Near-perfect running conditions today',
    8: 'Great day for a run',
    7: 'Good running conditions',
    6: 'Decent conditions — a hat may help',
    5: 'Manageable conditions with layers',
    4: 'Challenging conditions — shorten your run',
    3: 'Difficult — only if necessary',
    2: 'Poor conditions — consider the treadmill',
    1: 'Unsafe — avoid outdoor running',
    0: 'Unsafe — do not run outdoors',
  }

  const clamped = clamp(score, 0, 10)
  const reason = reasons[clamped] ?? reasons[Math.min(Math.max(Math.floor(clamped), 0), 9)] ?? 'Check conditions carefully'
  return makeScore(score, reason, bestWindow)
}

export function scoreCycling(
  hourly: HourlyWeather,
  daily: DailyWeather,
  targetDate: string,
): ActivityScore {
  const indices = getDateIndices(hourly, targetDate)
  const s = computeStats(hourly, indices)

  if (s.hasThunderstorm) return makeScore(0, 'Thunderstorm — do not cycle outdoors')

  let score = 10

  if (s.maxPrecipProb > 80) score -= 5
  else if (s.maxPrecipProb > 60) score -= 3
  else if (s.maxPrecipProb > 40) score -= 1

  // Wind is more impactful for cycling
  if (s.maxWindSpeed > 40) score -= 6
  else if (s.maxWindSpeed > 30) score -= 3
  else if (s.maxWindSpeed > 20) score -= 1

  if (s.maxTemp > 36) score -= 2
  else if (s.maxTemp > 32) score -= 1
  if (s.minTemp < -2) score -= 2

  const bestWindow = score >= 5 ? findBestWindow(hourly, indices, 7, 19) : undefined

  const reasonMap: [number, string][] = [
    [8, 'Excellent cycling conditions'],
    [6, 'Good day for a ride'],
    [4, 'Manageable — watch for gusts'],
    [2, 'Tough conditions for cycling'],
    [0, 'Unsafe cycling conditions'],
  ]
  const reason =
    reasonMap.find(([threshold]) => score >= threshold)?.[1] ?? 'Unsafe cycling conditions'

  return makeScore(score, reason, bestWindow)
}

export function scoreHiking(
  hourly: HourlyWeather,
  daily: DailyWeather,
  targetDate: string,
): ActivityScore {
  const indices = getDateIndices(hourly, targetDate)
  const s = computeStats(hourly, indices)

  if (s.hasThunderstorm) return makeScore(0, 'Thunderstorm — avoid hiking')

  let score = 10

  if (s.maxPrecipProb > 70) score -= 4
  else if (s.maxPrecipProb > 50) score -= 2
  else if (s.maxPrecipProb > 30) score -= 1

  if (s.maxWindSpeed > 55) score -= 3
  else if (s.maxWindSpeed > 40) score -= 1

  if (s.maxTemp > 35) score -= 2
  if (s.maxUV > 9) score -= 2
  else if (s.maxUV > 7) score -= 1

  const bestWindow = score >= 5 ? findBestWindow(hourly, indices, 7, 17) : undefined

  const reasonMap: [number, string][] = [
    [8, 'Perfect hiking weather'],
    [6, 'Good day on the trail'],
    [4, 'Manageable — bring rain gear'],
    [2, 'Difficult trail conditions today'],
    [0, 'Dangerous — avoid the trail'],
  ]
  const reason =
    reasonMap.find(([threshold]) => score >= threshold)?.[1] ?? 'Dangerous — avoid the trail'

  return makeScore(score, reason, bestWindow)
}

export function scorePhotography(
  hourly: HourlyWeather,
  daily: DailyWeather,
  targetDate: string,
): ActivityScore {
  const indices = getDateIndices(hourly, targetDate)
  const s = computeStats(hourly, indices)

  let score = 7 // Start at 7 — overcast can be good for photography

  // Partly cloudy is ideal for diffused light
  if (s.avgCloudCover > 20 && s.avgCloudCover < 60) score += 2
  else if (s.avgCloudCover >= 60 && s.avgCloudCover < 85) score += 1

  // Rain is bad for equipment
  if (s.maxPrecipProb > 70) score -= 4
  else if (s.maxPrecipProb > 50) score -= 2
  else if (s.maxPrecipProb > 30) score -= 1

  if (s.maxWindSpeed > 40) score -= 2

  if (s.hasThunderstorm) score -= 4

  const bestWindow = findBestWindow(hourly, indices, 6, 20)

  const reasonMap: [number, string][] = [
    [8, 'Ideal light — golden hour looks stunning'],
    [6, 'Good conditions for outdoor photography'],
    [4, 'Mixed light — diffused shots possible'],
    [2, 'Difficult — risk of rain on equipment'],
    [0, 'Not suitable for outdoor photography'],
  ]
  const reason =
    reasonMap.find(([threshold]) => score >= threshold)?.[1] ?? 'Not suitable for outdoor photography'

  return makeScore(score, reason, bestWindow)
}

export function scoreOutdoorDining(
  hourly: HourlyWeather,
  daily: DailyWeather,
  targetDate: string,
): ActivityScore {
  const indices = getDateIndices(hourly, targetDate)
  const s = computeStats(hourly, indices)

  if (s.hasThunderstorm) return makeScore(0, 'Thunderstorm — dine indoors')

  let score = 10

  if (s.maxPrecipProb > 50) score -= 5
  else if (s.maxPrecipProb > 30) score -= 2
  else if (s.maxPrecipProb > 15) score -= 1

  if (s.maxWindSpeed > 35) score -= 3
  else if (s.maxWindSpeed > 25) score -= 1

  if (s.maxTemp > 35) score -= 2
  else if (s.maxTemp > 30) score -= 1
  if (s.minTemp < 10) score -= 2
  else if (s.minTemp < 15) score -= 1

  const bestWindow = score >= 5 ? findBestWindow(hourly, indices, 11, 21) : undefined

  const reasonMap: [number, string][] = [
    [8, 'Perfect weather for dining al fresco'],
    [6, 'Lovely conditions for outdoor dining'],
    [4, 'Manageable — bring a light jacket'],
    [2, 'Uncomfortable — consider indoors'],
    [0, 'Unsuitable for outdoor dining'],
  ]
  const reason =
    reasonMap.find(([threshold]) => score >= threshold)?.[1] ?? 'Unsuitable for outdoor dining'

  return makeScore(score, reason, bestWindow)
}

export function scoreGardening(
  hourly: HourlyWeather,
  daily: DailyWeather,
  targetDate: string,
): ActivityScore {
  const indices = getDateIndices(hourly, targetDate)
  const s = computeStats(hourly, indices)

  if (s.hasThunderstorm) return makeScore(1, 'Thunderstorm — stay inside')

  let score = 8

  // Light rain is actually good for gardening
  if (s.avgPrecipProb > 70) score -= 3
  else if (s.avgPrecipProb > 40) score -= 1
  else if (s.avgPrecipProb > 20) score += 1 // light rain is beneficial

  if (s.maxWindSpeed > 40) score -= 2
  if (s.maxTemp > 35) score -= 3
  else if (s.maxTemp > 30) score -= 1
  if (s.maxUV > 9) score -= 2
  else if (s.maxUV > 7) score -= 1

  const bestWindow = score >= 5 ? findBestWindow(hourly, indices, 7, 18) : undefined

  const reasonMap: [number, string][] = [
    [8, 'Ideal gardening weather today'],
    [6, 'Good day to tend the garden'],
    [4, 'Manageable — hat and sunscreen advised'],
    [2, 'Uncomfortable garden conditions'],
    [0, 'Too harsh for gardening today'],
  ]
  const reason =
    reasonMap.find(([threshold]) => score >= threshold)?.[1] ?? 'Too harsh for gardening today'

  return makeScore(score, reason, bestWindow)
}

export function scoreBeach(
  hourly: HourlyWeather,
  daily: DailyWeather,
  targetDate: string,
): ActivityScore {
  const indices = getDateIndices(hourly, targetDate)
  const s = computeStats(hourly, indices)

  if (s.hasThunderstorm) return makeScore(0, 'Thunderstorm — beach is closed')

  let score = 5

  // Beach needs warmth
  if (s.maxTemp >= 28) score += 3
  else if (s.maxTemp >= 24) score += 2
  else if (s.maxTemp >= 20) score += 1
  else if (s.maxTemp < 18) score -= 2

  if (s.maxPrecipProb > 50) score -= 4
  else if (s.maxPrecipProb > 30) score -= 2

  if (s.maxWindSpeed > 35) score -= 2
  else if (s.maxWindSpeed > 25) score -= 1

  // High UV is a concern at the beach
  if (s.maxUV > 9) score -= 1

  const bestWindow = score >= 5 ? findBestWindow(hourly, indices, 10, 17) : undefined

  const reasonMap: [number, string][] = [
    [8, 'Perfect beach day — pack the sunscreen'],
    [6, 'Good beach conditions'],
    [4, 'Decent — bring a light layer'],
    [2, 'Chilly or unsettled — not ideal for beach'],
    [0, 'Not a beach day'],
  ]
  const reason =
    reasonMap.find(([threshold]) => score >= threshold)?.[1] ?? 'Not a beach day'

  return makeScore(score, reason, bestWindow)
}

export function scoreStargazing(
  hourly: HourlyWeather,
  daily: DailyWeather,
  targetDate: string,
): ActivityScore {
  // Stargazing is post-sunset only
  const dateIdx = daily.time.indexOf(targetDate)
  const sunsetStr = dateIdx >= 0 ? (daily.sunset[dateIdx] ?? '') : ''

  // Parse sunset hour
  const sunsetMatch = sunsetStr.match(/T(\d{2}):/)
  const sunsetHour = sunsetMatch ? parseInt(sunsetMatch[1], 10) : 20

  // Get post-sunset hourly indices for targetDate
  const indices = getDateIndices(hourly, targetDate).filter((i) => {
    const h = getHour(hourly.time[i] ?? '')
    return h > sunsetHour
  })

  // Also include early morning (0-5 AM) hours of same date for overnight
  const nightIndices = getDateIndices(hourly, targetDate).filter((i) => {
    const h = getHour(hourly.time[i] ?? '')
    return h <= 5 || h > sunsetHour
  })

  const evalIndices = nightIndices.length > 0 ? nightIndices : indices

  if (evalIndices.length === 0) {
    // No night data — use overall cloud cover as proxy
    const s = computeStats(hourly, getDateIndices(hourly, targetDate))
    const baseScore = s.avgCloudCover < 20 ? 7 : s.avgCloudCover < 50 ? 4 : 2
    return makeScore(
      baseScore,
      baseScore >= 6 ? 'Likely clear skies after sunset' : 'Cloudy skies may hinder stargazing',
    )
  }

  const s = computeStats(hourly, evalIndices)

  let score = 10

  // Cloud cover is the primary factor
  if (s.avgCloudCover > 80) score -= 8
  else if (s.avgCloudCover > 60) score -= 5
  else if (s.avgCloudCover > 40) score -= 3
  else if (s.avgCloudCover > 20) score -= 1

  // Rain ruins it completely
  if (s.maxPrecipProb > 60) score -= 8
  else if (s.maxPrecipProb > 40) score -= 4

  if (s.hasThunderstorm) score -= 4

  // Cold is unpleasant but acceptable
  if (s.minTemp < -5) score -= 2
  else if (s.minTemp < 5) score -= 1

  const reasonMap: [number, string][] = [
    [8, 'Excellent stargazing — crystal clear skies tonight'],
    [6, 'Good conditions for stargazing post-sunset'],
    [4, 'Partial cloud cover — some stars visible'],
    [2, 'Mostly cloudy — limited visibility'],
    [0, 'Overcast or wet — stargazing not possible'],
  ]
  const reason =
    reasonMap.find(([threshold]) => score >= threshold)?.[1] ?? 'Overcast or wet — stargazing not possible'

  return makeScore(score, reason)
}

export function scoreBBQ(
  hourly: HourlyWeather,
  daily: DailyWeather,
  targetDate: string,
): ActivityScore {
  const indices = getDateIndices(hourly, targetDate)
  const s = computeStats(hourly, indices)

  if (s.hasThunderstorm) return makeScore(0, 'Thunderstorm — cancel the BBQ')

  let score = 8

  if (s.maxPrecipProb > 50) score -= 4
  else if (s.maxPrecipProb > 30) score -= 2

  // Wind is bad for BBQ (embers, heat control)
  if (s.maxWindSpeed > 40) score -= 3
  else if (s.maxWindSpeed > 25) score -= 1

  if (s.maxTemp > 36) score -= 1
  if (s.minTemp < 10) score -= 2

  const bestWindow = score >= 5 ? findBestWindow(hourly, indices, 12, 20) : undefined

  const reasonMap: [number, string][] = [
    [8, 'Perfect BBQ weather — fire it up'],
    [6, 'Great evening for a cookout'],
    [4, 'Manageable — keep an eye on the wind'],
    [2, 'Tough BBQ conditions today'],
    [0, 'Not suitable for a BBQ'],
  ]
  const reason =
    reasonMap.find(([threshold]) => score >= threshold)?.[1] ?? 'Not suitable for a BBQ'

  return makeScore(score, reason, bestWindow)
}

export function scoreDogWalking(
  hourly: HourlyWeather,
  daily: DailyWeather,
  targetDate: string,
): ActivityScore {
  const indices = getDateIndices(hourly, targetDate)
  const s = computeStats(hourly, indices)

  if (s.hasThunderstorm) return makeScore(1, 'Thunderstorm — brief walk only, keep dog calm')

  let score = 9

  if (s.maxPrecipProb > 80) score -= 3
  else if (s.maxPrecipProb > 60) score -= 2
  else if (s.maxPrecipProb > 40) score -= 1

  if (s.maxWindSpeed > 50) score -= 2
  else if (s.maxWindSpeed > 35) score -= 1

  if (s.maxTemp > 30) score -= 2 // hot pavement risk for paws
  else if (s.maxTemp > 25) score -= 1
  if (s.minTemp < -5) score -= 1

  const bestWindow = score >= 5 ? findBestWindow(hourly, indices, 7, 19) : undefined

  const reasonMap: [number, string][] = [
    [8, 'Great conditions for a dog walk'],
    [6, 'Good walking conditions for you and your dog'],
    [4, 'Fine for a short walk — bring a towel'],
    [2, 'Wet or windy — keep walks brief'],
    [0, 'Best to skip the walk today'],
  ]
  const reason =
    reasonMap.find(([threshold]) => score >= threshold)?.[1] ?? 'Best to skip the walk today'

  return makeScore(score, reason, bestWindow)
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

const activityMap: Record<
  string,
  (h: HourlyWeather, d: DailyWeather, t: string) => ActivityScore
> = {
  running: scoreRunning,
  cycling: scoreCycling,
  hiking: scoreHiking,
  photography: scorePhotography,
  outdoorDining: scoreOutdoorDining,
  gardening: scoreGardening,
  beach: scoreBeach,
  stargazing: scoreStargazing,
  bbq: scoreBBQ,
  dogWalking: scoreDogWalking,
}

export function scoreActivity(
  activity: string,
  hourly: HourlyWeather,
  daily: DailyWeather,
  targetDate: string,
): ActivityScore {
  const fn = activityMap[activity]
  if (fn) return fn(hourly, daily, targetDate)

  // Default: use outdoor dining as a reasonable proxy
  return makeScore(5, 'Conditions appear average for this activity')
}
