import { isValid, isWithinInterval, parseISO } from 'date-fns'
import type { HourlyWeather } from '@/src/types/weather'

/** Visual treatment for the home ambient layer (gradients + particles). */
export type AmbientVisualKind =
  | 'clearDay'
  | 'clearNight'
  | 'partlyCloudyDay'
  | 'partlyCloudyNight'
  | 'cloudy'
  | 'rain'
  | 'snow'
  | 'fog'
  | 'thunder'

const THUNDER_CODES = new Set([82, 95, 96, 99])
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86])
const RAIN_CODES = new Set([51, 53, 55, 61, 63, 65, 80, 81])
const FOG_CODES = new Set([45, 48])

/**
 * True when `now` is between sunrise and sunset (local API instants).
 */
export function isDaytimeFromSun(sunriseIso: string, sunsetIso: string, now: Date = new Date()): boolean {
  try {
    const start = parseISO(sunriseIso)
    const end = parseISO(sunsetIso)
    if (!isValid(start) || !isValid(end)) return true
    return isWithinInterval(now, { start, end })
  } catch {
    return true
  }
}

/**
 * Map WMO weather code (+ day/night) to ambient visuals (Apple/Samsung-style hero backgrounds).
 */
export function getAmbientVisualKind(weatherCode: number, isDay: boolean): AmbientVisualKind {
  if (THUNDER_CODES.has(weatherCode)) return 'thunder'
  if (SNOW_CODES.has(weatherCode)) return 'snow'
  if (RAIN_CODES.has(weatherCode)) return 'rain'
  if (FOG_CODES.has(weatherCode)) return 'fog'
  if (weatherCode === 3) return 'cloudy'
  if (weatherCode === 2) return isDay ? 'partlyCloudyDay' : 'partlyCloudyNight'
  if (weatherCode === 0 || weatherCode === 1) return isDay ? 'clearDay' : 'clearNight'
  return isDay ? 'partlyCloudyDay' : 'partlyCloudyNight'
}

/**
 * WMO codes that should drive rain-style ambient particles (matches rain + thunder branches).
 * Used to avoid showing “rain” on overcast from precip % alone when hourly icons stay dry.
 */
export function isRainishAmbientWeatherCode(code: number): boolean {
  return RAIN_CODES.has(code) || THUNDER_CODES.has(code)
}

/** True if any of the first `hours` hourly slots use a rain/thunder WMO code. */
export function hasRainishHourlyInNextHours(hourly: HourlyWeather, hours: number): boolean {
  const n = Math.min(Math.max(0, Math.floor(hours)), hourly.weatherCode.length)
  for (let i = 0; i < n; i++) {
    if (isRainishAmbientWeatherCode(hourly.weatherCode[i])) return true
  }
  return false
}
