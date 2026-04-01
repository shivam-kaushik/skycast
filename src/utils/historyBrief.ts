import type { DailyWeather, Era5DailyWeather } from '@/src/types/weather'
import { formatTemp } from '@/src/utils/formatTemp'

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export interface HistoryBriefResult {
  /** Human-readable lines for UI. */
  lines: string[]
  /** e.g. "2026-03-25 – 2026-03-31" */
  periodRange: string
}

export function buildHistoryBrief(
  era5: Era5DailyWeather,
  forecastDaily: DailyWeather,
  unit: 'C' | 'F',
): HistoryBriefResult {
  const avgMax = mean(era5.tempMax)
  const avgMin = mean(era5.tempMin)
  const rainDays = era5.precipitationSum.filter((p) => p >= 0.5).length
  const totalRain = era5.precipitationSum.reduce((sum, mm) => sum + mm, 0)

  const todayMax = forecastDaily.tempMax[0] ?? avgMax
  const delta = todayMax - avgMax

  const lines: string[] = []
  lines.push(
    `The last full week in ERA5 averaged ${formatTemp(avgMax, unit)} highs and ${formatTemp(avgMin, unit)} lows.`,
  )

  if (rainDays >= 4) {
    lines.push(
      `${rainDays} days had measurable rain; total near ${totalRain.toFixed(1)} mm.`,
    )
  } else if (totalRain < 2) {
    lines.push('Rain was scarce that week.')
  } else {
    lines.push(`Roughly ${totalRain.toFixed(1)} mm of rain fell over the week.`)
  }

  if (delta > 2) {
    lines.push(`Today's outlook is warmer than that recent week-long average.`)
  } else if (delta < -2) {
    lines.push(`Today's outlook is cooler than that recent week-long average.`)
  } else {
    lines.push(`Today's high is close to that recent average.`)
  }

  const first = era5.time[0] ?? ''
  const last = era5.time[era5.time.length - 1] ?? ''
  const periodRange = first && last ? `${first} – ${last}` : ''

  return { lines, periodRange }
}
