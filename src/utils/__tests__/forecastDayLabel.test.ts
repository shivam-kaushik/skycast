import { getForecastDayLabel } from '@/src/utils/forecastDayLabel'

describe('getForecastDayLabel', () => {
  it('returns "Today" for index 0 regardless of date', () => {
    expect(getForecastDayLabel('2026-09-20', 0)).toBe('Today')
  })

  it('returns "Tomorrow" for index 1 regardless of date', () => {
    expect(getForecastDayLabel('2026-09-21', 1)).toBe('Tomorrow')
  })

  it('returns the weekday name for index >= 2', () => {
    // 2026-09-22 is a Tuesday
    expect(getForecastDayLabel('2026-09-22', 2)).toBe('Tue')
  })

  it('computes the weekday from the local calendar date, not UTC parsing drift', () => {
    // 2026-01-01 is a Thursday
    expect(getForecastDayLabel('2026-01-01', 5)).toBe('Thu')
  })

  it('falls back to slicing the raw string when the date is unparseable', () => {
    expect(getForecastDayLabel('not-a-date', 3)).toBe('-date')
  })

  it('handles end-of-year dates correctly', () => {
    // 2025-12-31 is a Wednesday
    expect(getForecastDayLabel('2025-12-31', 6)).toBe('Wed')
  })
})
