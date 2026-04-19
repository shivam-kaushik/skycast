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

/**
 * Time-of-day phase used to drive gradient palette selection and atmospheric effects.
 * - dawn:      ±50 min around sunrise
 * - morning:   after dawn window → solar noon
 * - afternoon: solar noon → before dusk window
 * - dusk:      ±50 min around sunset
 * - night:     after dusk window → before dawn window
 */
export type TimePhase = 'dawn' | 'morning' | 'afternoon' | 'dusk' | 'night'

/** Half of the dawn/dusk transition window (ms). */
const TRANSITION_HALF_MS = 50 * 60 * 1000

const THUNDER_CODES = new Set([82, 95, 96, 99])
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86])
const RAIN_CODES = new Set([51, 53, 55, 61, 63, 65, 80, 81])
const FOG_CODES = new Set([45, 48])

/**
 * Determine the time-of-day phase from sunrise/sunset ISO strings.
 * Falls back to 'morning' when the strings are missing or unparseable.
 */
export function getTimePhase(
  sunriseIso: string,
  sunsetIso: string,
  now: Date = new Date(),
): TimePhase {
  try {
    const sunrise = parseISO(sunriseIso)
    const sunset = parseISO(sunsetIso)
    if (!isValid(sunrise) || !isValid(sunset)) return 'morning'

    const t = now.getTime()
    const rise = sunrise.getTime()
    const set = sunset.getTime()

    if (t >= rise - TRANSITION_HALF_MS && t < rise + TRANSITION_HALF_MS) return 'dawn'
    if (t >= set - TRANSITION_HALF_MS && t < set + TRANSITION_HALF_MS) return 'dusk'
    if (t >= rise && t < set) {
      return (t - rise) / (set - rise) < 0.5 ? 'morning' : 'afternoon'
    }
    return 'night'
  } catch {
    return 'morning'
  }
}

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
 * Map WMO weather code (+ day/night + precip probability) to ambient visuals.
 *
 * `precipPct` is the current precipitation probability (0–100).  When the WMO code
 * says overcast (3) but precipitation is already high, we treat the visual as rain
 * so the background reacts correctly to real-world conditions.
 */
export function getAmbientVisualKind(
  weatherCode: number,
  isDay: boolean,
  precipPct = 0,
): AmbientVisualKind {
  if (THUNDER_CODES.has(weatherCode)) return 'thunder'
  if (SNOW_CODES.has(weatherCode)) return 'snow'
  if (RAIN_CODES.has(weatherCode)) return 'rain'
  if (FOG_CODES.has(weatherCode)) return 'fog'
  if (weatherCode === 3) {
    // Overcast + high precipitation probability → show rain visuals
    if (precipPct >= 55) return 'rain'
    return 'cloudy'
  }
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
