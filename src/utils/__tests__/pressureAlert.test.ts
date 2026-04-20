import { detectPressureAlert } from '@/src/utils/pressureAlert'

describe('detectPressureAlert', () => {
  it('returns no alert for stable pressure', () => {
    const pressure = Array.from({ length: 15 }, () => 1013)
    expect(detectPressureAlert(pressure, 0).alert).toBe(false)
  })

  it('detects drop > 8 hPa in 3 hours', () => {
    const pressure = [1013, 1010, 1007, 1004, 1002, 1001, 1000, 999, 998]
    const result = detectPressureAlert(pressure, 0)
    expect(result.alert).toBe(true)
    expect(result.direction).toBe('falling')
    expect(result.delta).toBeLessThan(-8)
  })

  it('detects rise > 10 hPa in 3 hours', () => {
    const pressure = [1000, 1003, 1007, 1012, 1013, 1013]
    const result = detectPressureAlert(pressure, 0)
    expect(result.alert).toBe(true)
    expect(result.direction).toBe('rising')
    expect(result.delta).toBeGreaterThan(10)
  })

  it('respects fromIndex offset', () => {
    const pressure = [1013, 1013, 1013, 1013, 1013, 1010, 1007, 1004, 1002]
    expect(detectPressureAlert(pressure, 0).alert).toBe(false)
    expect(detectPressureAlert(pressure, 2).alert).toBe(true)
  })
})
