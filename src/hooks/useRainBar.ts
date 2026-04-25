import { useMemo } from 'react'
import type { HourlyWeather, RainSegment } from '@/src/types/weather'

function getCurrentHourIdx(times: string[]): number {
  const prefix = new Date().toISOString().slice(0, 13)
  const idx = times.findIndex((t) => t.startsWith(prefix))
  return idx === -1 ? 0 : idx
}

interface RainBarResult {
  segments: RainSegment[]
  peakProbability: number
  peakTime: Date | null
}

export function useRainBar(hourly: HourlyWeather | undefined): RainBarResult {
  return useMemo(() => {
    if (!hourly) return { segments: [], peakProbability: 0, peakTime: null }

    const fromIdx = getCurrentHourIdx(hourly.time)
    const SEGMENT_COUNT = 12
    const SEGMENT_MINUTES = 15
    const segments: RainSegment[] = []

    for (let s = 0; s < SEGMENT_COUNT; s++) {
      const minutesOffset = s * SEGMENT_MINUTES
      const hourOffset = minutesOffset / 60
      const hourFloor = Math.floor(hourOffset)
      const frac = hourOffset - hourFloor

      const i0 = fromIdx + hourFloor
      const i1 = Math.min(i0 + 1, hourly.precipitationProbability.length - 1)

      const p0 = hourly.precipitationProbability[i0] ?? 0
      const p1 = hourly.precipitationProbability[i1] ?? p0
      const probability = p0 + (p1 - p0) * frac

      const baseTime = new Date(hourly.time[i0] ?? new Date().toISOString())
      const time = new Date(baseTime.getTime() + (minutesOffset % 60) * 60 * 1000)
      segments.push({ probability, time })
    }

    const peakProbability = segments.reduce((m, s) => Math.max(m, s.probability), 0)
    const peakSeg = segments.find((s) => s.probability === peakProbability)

    return {
      segments,
      peakProbability,
      peakTime: peakProbability >= 10 ? (peakSeg?.time ?? null) : null,
    }
  }, [hourly])
}
