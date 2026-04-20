import type { PressureAlertData } from '@/src/types/weather'

const DROP_THRESHOLD = 8
const RISE_THRESHOLD = 10

export function detectPressureAlert(
  surfacePressureHourly: number[],
  fromIndex: number,
): PressureAlertData {
  const windowHours = 3
  const lookAhead = 3
  const end = Math.min(fromIndex + lookAhead, surfacePressureHourly.length - windowHours)

  for (let i = fromIndex; i <= end; i++) {
    const start = surfacePressureHourly[i] ?? 0
    const later = surfacePressureHourly[i + windowHours] ?? 0
    const delta = later - start

    if (delta < -DROP_THRESHOLD) {
      return { alert: true, delta, direction: 'falling', windowStart: i }
    }
    if (delta > RISE_THRESHOLD) {
      return { alert: true, delta, direction: 'rising', windowStart: i }
    }
  }

  return { alert: false, delta: 0, direction: 'falling', windowStart: fromIndex }
}
