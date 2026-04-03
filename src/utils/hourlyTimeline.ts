import { parseISO } from 'date-fns'
import type { DailyWeather, HourlyWeather } from '@/src/types/weather'

export type TimelineSlot =
  | { kind: 'hour'; timeIso: string; hourlyIdx: number }
  | { kind: 'sunrise'; timeIso: string }
  | { kind: 'sunset'; timeIso: string }

/** Same clock minute → keep a single column (prefer the hourly slot over sun markers). */
function dedupeSameMinute(slots: TimelineSlot[]): TimelineSlot[] {
  const out: TimelineSlot[] = []
  for (const s of slots) {
    const key = s.timeIso.slice(0, 16)
    const last = out[out.length - 1]
    if (last && last.timeIso.slice(0, 16) === key) {
      if (s.kind === 'hour' && last.kind !== 'hour') {
        out[out.length - 1] = s
      }
      continue
    }
    out.push(s)
  }
  return out
}

/**
 * Hourly steps for the strip plus sunrise/sunset when they fall inside the same window
 * (supports today and tomorrow rows from `daily`).
 */
export function mergeHourlyWithSunEvents(
  hourly: HourlyWeather,
  daily: DailyWeather,
  startIdx: number,
  maxHours: number,
): TimelineSlot[] {
  const endIdx = Math.min(startIdx + maxHours, hourly.time.length)
  if (startIdx >= endIdx) return []

  const windowStart = parseISO(hourly.time[startIdx]).getTime()
  const windowEnd = parseISO(hourly.time[endIdx - 1]).getTime()

  const slots: TimelineSlot[] = []
  for (let i = startIdx; i < endIdx; i++) {
    slots.push({ kind: 'hour', timeIso: hourly.time[i], hourlyIdx: i })
  }

  for (let d = 0; d < daily.sunrise.length; d++) {
    const sr = daily.sunrise[d]
    if (sr) {
      const t = parseISO(sr).getTime()
      if (t >= windowStart && t <= windowEnd) {
        slots.push({ kind: 'sunrise', timeIso: sr })
      }
    }
  }
  for (let d = 0; d < daily.sunset.length; d++) {
    const ss = daily.sunset[d]
    if (ss) {
      const t = parseISO(ss).getTime()
      if (t >= windowStart && t <= windowEnd) {
        slots.push({ kind: 'sunset', timeIso: ss })
      }
    }
  }

  slots.sort((a, b) => parseISO(a.timeIso).getTime() - parseISO(b.timeIso).getTime())
  return dedupeSameMinute(slots)
}

export interface HourlyChartPoint {
  colIndex: number
  temp: number
  hourlyIdx: number
}

/** Columns that get a temperature dot and polyline vertex (sun columns are skipped). */
export function chartPointsFromSlots(slots: TimelineSlot[], hourly: HourlyWeather): HourlyChartPoint[] {
  const pts: HourlyChartPoint[] = []
  slots.forEach((slot, colIndex) => {
    if (slot.kind !== 'hour') return
    const temp = hourly.temperature[slot.hourlyIdx]
    if (typeof temp !== 'number') return
    pts.push({ colIndex, temp, hourlyIdx: slot.hourlyIdx })
  })
  return pts
}

export function tempRangeForChart(points: HourlyChartPoint[]): { min: number; max: number } {
  if (points.length === 0) return { min: 0, max: 1 }
  let min = points[0].temp
  let max = points[0].temp
  for (const p of points) {
    if (p.temp < min) min = p.temp
    if (p.temp > max) max = p.temp
  }
  if (max - min < 1) {
    min -= 0.5
    max += 0.5
  }
  return { min, max }
}
