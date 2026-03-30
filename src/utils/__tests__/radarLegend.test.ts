import { getRadarLegend } from '@/src/utils/radarLegend'

describe('getRadarLegend', () => {
  it('returns precipitation levels in expected order', () => {
    const legend = getRadarLegend('precipitation')
    expect(legend.title).toBe('Precipitation')
    expect(legend.stops.map((stop) => stop.label)).toEqual([
      'Extreme',
      'Heavy',
      'Moderate',
      'Light',
    ])
  })

  it('returns air quality legend with good level', () => {
    const legend = getRadarLegend('air')
    expect(legend.title).toBe('Air Quality')
    expect(legend.stops.some((stop) => stop.label === 'Good')).toBe(true)
  })

  it('returns hex color values for every stop', () => {
    const legend = getRadarLegend('temperature')
    for (const stop of legend.stops) {
      expect(stop.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})
