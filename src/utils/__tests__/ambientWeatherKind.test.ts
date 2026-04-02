import {
  getAmbientVisualKind,
  isDaytimeFromSun,
} from '@/src/utils/ambientWeatherKind'

describe('isDaytimeFromSun', () => {
  it('returns true between sunrise and sunset', () => {
    const noon = new Date('2026-06-15T12:00:00.000Z')
    const ok = isDaytimeFromSun(
      '2026-06-15T06:00:00.000Z',
      '2026-06-15T20:00:00.000Z',
      noon,
    )
    expect(ok).toBe(true)
  })

  it('returns false at night', () => {
    const night = new Date('2026-06-15T22:00:00.000Z')
    const ok = isDaytimeFromSun(
      '2026-06-15T06:00:00.000Z',
      '2026-06-15T20:00:00.000Z',
      night,
    )
    expect(ok).toBe(false)
  })
})

describe('getAmbientVisualKind', () => {
  it('maps clear sky by day and night', () => {
    expect(getAmbientVisualKind(0, true)).toBe('clearDay')
    expect(getAmbientVisualKind(0, false)).toBe('clearNight')
  })

  it('maps precipitation and thunder', () => {
    expect(getAmbientVisualKind(65, true)).toBe('rain')
    expect(getAmbientVisualKind(95, true)).toBe('thunder')
    expect(getAmbientVisualKind(71, true)).toBe('snow')
  })

  it('maps clouds and fog', () => {
    expect(getAmbientVisualKind(3, true)).toBe('cloudy')
    expect(getAmbientVisualKind(2, true)).toBe('partlyCloudyDay')
    expect(getAmbientVisualKind(2, false)).toBe('partlyCloudyNight')
    expect(getAmbientVisualKind(45, true)).toBe('fog')
  })
})
