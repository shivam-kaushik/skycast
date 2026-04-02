import type { HourlyWeather } from '@/src/types/weather'

/** Highest hourly precip probability in the next `hours` slots (aligns UX with “rain later”). */
export function maxPrecipitationProbabilityNextHours(
  hourly: HourlyWeather,
  hours: number,
): number {
  const n = Math.min(Math.max(0, Math.floor(hours)), hourly.precipitationProbability.length)
  let m = 0
  for (let i = 0; i < n; i++) {
    const v = hourly.precipitationProbability[i]
    if (typeof v === 'number' && v > m) m = v
  }
  return m
}
