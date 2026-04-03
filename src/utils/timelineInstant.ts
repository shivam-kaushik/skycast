import { isValid, parseISO } from 'date-fns'

/** Parse Open-Meteo / RainViewer timeline values (ISO string or Unix seconds/ms). */
export function parseTimelineInstant(s: string): Date | null {
  if (!s || !String(s).trim()) return null
  const trimmed = String(s).trim()
  const fromIso = parseISO(trimmed)
  if (isValid(fromIso)) return fromIso
  const n = Number(trimmed)
  if (!Number.isFinite(n)) return null
  const ms = n > 1e12 ? n : n * 1000
  const d = new Date(ms)
  return isValid(d) ? d : null
}

export function formatTimelineClock(d: Date | null): string {
  if (!d) return '—'
  const h = d.getHours()
  const m = d.getMinutes()
  const am = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  const mm = m < 10 ? `0${m}` : String(m)
  return `${h12}:${mm} ${am}`
}

/** First entry in `times` that parses to a valid instant (for scrubber end labels). */
export function firstParsedTimelineDate(times: readonly string[]): Date | null {
  for (const s of times) {
    const d = parseTimelineInstant(s)
    if (d) return d
  }
  return null
}

/** Last entry in `times` that parses to a valid instant. */
export function lastParsedTimelineDate(times: readonly string[]): Date | null {
  for (let i = times.length - 1; i >= 0; i--) {
    const d = parseTimelineInstant(times[i] ?? '')
    if (d) return d
  }
  return null
}
