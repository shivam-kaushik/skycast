import { formatTemp } from '@/src/utils/formatTemp'

describe('formatTemp', () => {
  it('rounds and appends °C for Celsius', () => {
    expect(formatTemp(19.4, 'C')).toBe('19°C')
    expect(formatTemp(19.6, 'C')).toBe('20°C')
  })

  it('converts to Fahrenheit and rounds', () => {
    expect(formatTemp(0, 'F')).toBe('32°F')
    expect(formatTemp(100, 'F')).toBe('212°F')
    expect(formatTemp(19, 'F')).toBe('66°F')
  })

  it('handles negative temperatures', () => {
    expect(formatTemp(-5, 'C')).toBe('-5°C')
    expect(formatTemp(-40, 'F')).toBe('-40°F')
  })

  it('handles zero', () => {
    expect(formatTemp(0, 'C')).toBe('0°C')
  })
})
