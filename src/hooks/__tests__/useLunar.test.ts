import SunCalc from 'suncalc'
import { useLunar } from '@/src/hooks/useLunar'
import { renderHook } from '@/src/utils/testHookHarness'

jest.mock('suncalc', () => ({
  __esModule: true,
  default: {
    getMoonIllumination: jest.fn(),
    getMoonTimes: jest.fn(),
  },
}))

const mockIllumination = SunCalc.getMoonIllumination as jest.Mock
const mockMoonTimes = SunCalc.getMoonTimes as jest.Mock

const NOW = new Date('2026-09-20T12:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1000
const SYNODIC_MS = 29.53 * DAY_MS

/** Synthetic lunar cycle: `phaseAtNow` at NOW, advancing linearly and wrapping at 1. */
function useSyntheticCycle(phaseAtNow: number, fraction = 0.5): void {
  const epoch = NOW.getTime() - phaseAtNow * SYNODIC_MS
  mockIllumination.mockImplementation((date: Date) => ({
    phase: (((date.getTime() - epoch) / SYNODIC_MS) % 1 + 1) % 1,
    fraction,
    angle: 0,
  }))
}

describe('useLunar', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW)
    mockIllumination.mockReset()
    mockMoonTimes.mockReset()
    mockMoonTimes.mockReturnValue({})
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns null when coordinates are missing', () => {
    expect(renderHook(() => useLunar(null, 10)).current).toBeNull()
    expect(renderHook(() => useLunar(10, null)).current).toBeNull()
    expect(mockIllumination).not.toHaveBeenCalled()
  })

  it.each([
    [0.0, 'New Moon'],
    [0.02, 'New Moon'],
    [0.98, 'New Moon'],
    [0.1, 'Waxing Crescent'],
    [0.25, 'First Quarter'],
    [0.4, 'Waxing Gibbous'],
    [0.5, 'Full Moon'],
    [0.6, 'Waning Gibbous'],
    [0.75, 'Last Quarter'],
    [0.85, 'Waning Crescent'],
  ])('names phase %p as %s', (phase, expected) => {
    useSyntheticCycle(phase)
    const result = renderHook(() => useLunar(43.65, -79.38))
    expect(result.current?.phaseName).toBe(expected)
  })

  it('exposes illumination fraction and phase angle', () => {
    useSyntheticCycle(0.25, 0.42)
    const { current } = renderHook(() => useLunar(43.65, -79.38))
    expect(current?.illumination).toBe(0.42)
    expect(current?.phaseAngle).toBeCloseTo(0.25, 5)
  })

  it('passes rise/set times through and falls back to null when the moon does not rise or set', () => {
    useSyntheticCycle(0.25)
    const rise = new Date('2026-09-20T15:00:00.000Z')
    mockMoonTimes.mockReturnValue({ rise })
    const { current } = renderHook(() => useLunar(43.65, -79.38))
    expect(current?.rise).toBe(rise)
    expect(current?.set).toBeNull()
  })

  it('finds the next full moon and next new moon within the 30-day search window', () => {
    useSyntheticCycle(0.25) // first quarter today → full moon in ~7.4 days, new moon in ~22 days
    const { current } = renderHook(() => useLunar(43.65, -79.38))
    expect(current?.nextFullMoon.getTime()).toBe(NOW.getTime() + 8 * DAY_MS)
    expect(current?.nextNewMoon.getTime()).toBe(NOW.getTime() + 23 * DAY_MS)
  })

  it('falls back to 15 days out when no phase crossing is found', () => {
    mockIllumination.mockReturnValue({ phase: 0.3, fraction: 0.5, angle: 0 })
    const { current } = renderHook(() => useLunar(43.65, -79.38))
    expect(current?.nextFullMoon.getTime()).toBe(NOW.getTime() + 15 * DAY_MS)
    expect(current?.nextNewMoon.getTime()).toBe(NOW.getTime() + 15 * DAY_MS)
  })
})
