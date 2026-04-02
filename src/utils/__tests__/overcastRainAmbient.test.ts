import { OVERCAST_RAIN_MIN_PCT, rainOpacityForOvercast } from '@/src/utils/overcastRainAmbient'

describe('rainOpacityForOvercast', () => {
  it('returns 0 below threshold', () => {
    expect(rainOpacityForOvercast(0)).toBe(0)
    expect(rainOpacityForOvercast(OVERCAST_RAIN_MIN_PCT - 1)).toBe(0)
  })

  it('returns positive at threshold and scales up', () => {
    expect(rainOpacityForOvercast(OVERCAST_RAIN_MIN_PCT)).toBeGreaterThan(0)
    expect(rainOpacityForOvercast(100)).toBeGreaterThan(rainOpacityForOvercast(40))
  })
})
