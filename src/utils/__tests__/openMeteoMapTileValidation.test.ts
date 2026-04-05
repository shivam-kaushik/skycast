import { validateOpenMeteoValidTimesPayload } from '@/src/utils/openMeteoMapTileValidation'

describe('validateOpenMeteoValidTimesPayload', () => {
  it('accepts a typical Open-Meteo map metadata shape', () => {
    const r = validateOpenMeteoValidTimesPayload({
      valid_times: ['2026-04-01T12:00:00Z', '2026-04-01T13:00:00Z'],
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.count).toBe(2)
  })

  it('rejects empty valid_times', () => {
    const r = validateOpenMeteoValidTimesPayload({ valid_times: [] })
    expect(r.ok).toBe(false)
  })

  it('rejects missing valid_times', () => {
    const r = validateOpenMeteoValidTimesPayload({})
    expect(r.ok).toBe(false)
  })
})
