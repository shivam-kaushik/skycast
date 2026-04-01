import { formatTimelineClock, parseTimelineInstant } from '@/src/utils/timelineInstant'

describe('parseTimelineInstant', () => {
  it('parses ISO strings', () => {
    const d = parseTimelineInstant('2026-04-01T14:30:00.000Z')
    expect(d).not.toBeNull()
    expect(d!.toISOString()).toBe('2026-04-01T14:30:00.000Z')
  })

  it('parses Unix seconds as string', () => {
    const d = parseTimelineInstant('1710000000')
    expect(d).not.toBeNull()
    expect(d!.getTime()).toBe(1710000000 * 1000)
  })

  it('parses Unix milliseconds as string', () => {
    const d = parseTimelineInstant('1710000000000')
    expect(d).not.toBeNull()
    expect(d!.getTime()).toBe(1710000000000)
  })

  it('returns null for empty or invalid', () => {
    expect(parseTimelineInstant('')).toBeNull()
    expect(parseTimelineInstant('not-a-date')).toBeNull()
  })
})

describe('formatTimelineClock', () => {
  it('formats a valid date', () => {
    const s = formatTimelineClock(new Date('2026-04-01T14:05:00.000Z'))
    expect(s).toMatch(/\d{1,2}:\d{2}/)
    expect(s).toMatch(/AM|PM/)
  })

  it('returns em dash for null', () => {
    expect(formatTimelineClock(null)).toBe('—')
  })
})
