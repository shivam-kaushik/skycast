import { useMemo } from 'react'
import SunCalc from 'suncalc'
import type { HourlyWeather, SkyPhenomena } from '@/src/types/weather'
import { computeStargazingScore, computeSunsetScore, detectRainbowWindow } from '@/src/utils/skyPhenomena'

function getCurrentHourIdx(times: string[]): number {
  const prefix = new Date().toISOString().slice(0, 13)
  const idx = times.findIndex((t) => t.startsWith(prefix))
  return idx === -1 ? 0 : idx
}

export function useSkyPhenomena(
  hourly: HourlyWeather | undefined,
  lat: number | null,
  lon: number | null,
): SkyPhenomena | null {
  return useMemo(() => {
    if (!hourly || lat === null || lon === null) return null
    const now = new Date()
    const sunTimes = SunCalc.getTimes(now, lat, lon)
    const idx = getCurrentHourIdx(hourly.time)

    const cloudCover = hourly.cloudCover[idx] ?? 50
    const humidity = hourly.humidity[idx] ?? 50
    const weatherCode = hourly.weatherCode[idx] ?? 0
    const precipProb = hourly.precipitationProbability[idx] ?? 0
    const visKm = hourly.visibility[idx] ?? 10
    const moonIll = SunCalc.getMoonIllumination(now)

    return {
      stargazingScore: computeStargazingScore(cloudCover, moonIll.fraction, visKm),
      sunsetScore: computeSunsetScore(cloudCover, humidity, weatherCode, precipProb),
      goldenHourStart: sunTimes.goldenHour,
      goldenHourEnd: sunTimes.goldenHourEnd,
      goldenHourQuality: cloudCover < 20 ? 'Excellent' : cloudCover < 50 ? 'Good' : 'Fair',
      rainbowWindow: detectRainbowWindow(hourly, lat, lon, idx),
    }
  }, [hourly, lat, lon])
}
