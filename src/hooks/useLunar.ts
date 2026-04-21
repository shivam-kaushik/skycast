import { useMemo } from 'react'
import SunCalc from 'suncalc'
import type { LunarData } from '@/src/types/weather'

function getPhaseName(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return 'New Moon'
  if (phase < 0.22) return 'Waxing Crescent'
  if (phase < 0.28) return 'First Quarter'
  if (phase < 0.47) return 'Waxing Gibbous'
  if (phase < 0.53) return 'Full Moon'
  if (phase < 0.72) return 'Waning Gibbous'
  if (phase < 0.78) return 'Last Quarter'
  return 'Waning Crescent'
}

function findNextMoonPhase(targetPhase: number): Date {
  const now = new Date()
  for (let d = 1; d <= 30; d++) {
    const date = new Date(now.getTime() + d * 24 * 60 * 60 * 1000)
    const prev = new Date(date.getTime() - 24 * 60 * 60 * 1000)
    const ill = SunCalc.getMoonIllumination(date)
    const prevIll = SunCalc.getMoonIllumination(prev)
    if (targetPhase === 0.5) {
      if (prevIll.phase < 0.5 && ill.phase >= 0.5) return date
    } else {
      if (prevIll.phase > 0.9 && ill.phase < 0.1) return date
    }
  }
  return new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
}

export function useLunar(lat: number | null, lon: number | null): LunarData | null {
  return useMemo(() => {
    if (lat === null || lon === null) return null
    const now = new Date()
    const ill = SunCalc.getMoonIllumination(now)
    const times = SunCalc.getMoonTimes(now, lat, lon)
    return {
      phaseName: getPhaseName(ill.phase),
      illumination: ill.fraction,
      phaseAngle: ill.phase,
      rise: times.rise ?? null,
      set: times.set ?? null,
      nextFullMoon: findNextMoonPhase(0.5),
      nextNewMoon: findNextMoonPhase(0),
    }
  }, [lat, lon])
}
