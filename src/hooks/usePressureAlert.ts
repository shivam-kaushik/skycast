import { useMemo } from 'react'
import type { HourlyWeather, PressureAlertData } from '@/src/types/weather'
import { detectPressureAlert } from '@/src/utils/pressureAlert'

function getCurrentHourIdx(times: string[]): number {
  const prefix = new Date().toISOString().slice(0, 13)
  const idx = times.findIndex((t) => t.startsWith(prefix))
  return idx === -1 ? 0 : idx
}

const NO_ALERT: PressureAlertData = { alert: false, delta: 0, direction: 'falling', windowStart: 0 }

export function usePressureAlert(hourly: HourlyWeather | undefined): PressureAlertData {
  return useMemo(() => {
    if (!hourly?.surfacePressure?.length) return NO_ALERT
    const fromIdx = getCurrentHourIdx(hourly.time)
    return detectPressureAlert(hourly.surfacePressure, fromIdx)
  }, [hourly])
}
