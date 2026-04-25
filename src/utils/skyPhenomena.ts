import SunCalc from 'suncalc'
import type { HourlyWeather, RainbowWindow } from '@/src/types/weather'

export function computeStargazingScore(
  cloudCoverPercent: number,
  moonIllumination: number,
  visibilityKm: number,
): number {
  const base = 10
  const cloudPenalty = cloudCoverPercent / 10
  const moonPenalty = moonIllumination * 3
  const visBonus = Math.min(visibilityKm / 20, 1)
  return Math.max(0, Math.min(10, base - cloudPenalty - moonPenalty + visBonus))
}

export function computeSunsetScore(
  cloudCoverPercent: number,
  humidity: number,
  weatherCode: number,
  precipProbability: number,
): number {
  let score = 5
  if (cloudCoverPercent >= 20 && cloudCoverPercent <= 50) score += 2
  if (cloudCoverPercent > 70) score -= 3
  if (humidity >= 40 && humidity <= 65) score += 1
  if ([1, 2, 3].includes(weatherCode)) score += 1
  if (precipProbability > 50) score -= 2
  return Math.max(0, Math.min(10, score))
}

type CompassDir = RainbowWindow['faceDirection']

function azimuthToCompass(azimuthRad: number): CompassDir {
  const bearing = ((180 + azimuthRad * (180 / Math.PI)) % 360 + 360) % 360
  const dirs: CompassDir[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(bearing / 45) % 8] ?? 'N'
}

export function detectRainbowWindow(
  hourly: HourlyWeather,
  lat: number,
  lon: number,
  fromIndex: number,
): RainbowWindow | null {
  const lookAhead = 4
  const end = Math.min(fromIndex + lookAhead, hourly.time.length - 1)

  for (let i = fromIndex; i < end - 1; i++) {
    const precip = hourly.precipitationProbability[i] ?? 0
    if (precip <= 40) continue

    const nextIdx = i + 1
    const precipNext = hourly.precipitationProbability[nextIdx] ?? 100
    if (precipNext >= 20) continue

    const cloud = hourly.cloudCover[nextIdx] ?? 100
    if (cloud >= 60) continue

    const clearingTime = new Date(hourly.time[nextIdx] ?? '')
    const pos = SunCalc.getPosition(clearingTime, lat, lon)
    const altDeg = pos.altitude * (180 / Math.PI)
    if (altDeg < 20 || altDeg > 42) continue

    const dirs: CompassDir[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    const sunDir = azimuthToCompass(pos.azimuth)
    const sunIdx = dirs.indexOf(sunDir)
    const faceDirection = dirs[(sunIdx + 4) % 8] ?? 'N'
    return { likelyAt: clearingTime, faceDirection }
  }
  return null
}
