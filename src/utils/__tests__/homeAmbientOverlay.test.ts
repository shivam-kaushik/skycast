import { homeScrimGradient } from '@/src/utils/homeAmbientOverlay'
import type { AmbientVisualKind } from '@/src/utils/ambientWeatherKind'
import { BG } from '@/src/theme/colors'

const ALL_KINDS: AmbientVisualKind[] = [
  'clearDay', 'clearNight', 'partlyCloudyDay', 'partlyCloudyNight', 'cloudy', 'rain', 'snow', 'fog', 'thunder',
]

/** Alpha of the top stop for each kind — how much of the sky shows through the hero. */
const TOP_ALPHA: Record<AmbientVisualKind, string> = {
  clearDay: '0.03',
  clearNight: '0.2',
  partlyCloudyDay: '0.02',
  partlyCloudyNight: '0.02',
  cloudy: '0.02',
  rain: '0.12',
  snow: '0.1',
  fog: '0.1',
  thunder: '0.22',
}

describe('homeScrimGradient', () => {
  it('uses lighter hero scrim for cloudy so sky motion stays visible', () => {
    const g = homeScrimGradient('cloudy')
    expect(g.colors[0]).toContain('0.02')
    expect(g.locations.length).toBe(4)
  })

  it('uses heavier scrim for storm conditions', () => {
    const g = homeScrimGradient('thunder')
    expect(g.colors[0]).toContain('0.22')
  })

  it.each(ALL_KINDS)('returns a 4-stop gradient for %s that fades into the app background', (kind) => {
    const g = homeScrimGradient(kind)

    expect(g.colors).toHaveLength(4)
    expect(g.locations).toHaveLength(4)
    expect(g.colors[3]).toBe(BG)
  })

  it.each(ALL_KINDS)('starts the %s gradient at 0 and ends at 1 with increasing stops', (kind) => {
    const { locations } = homeScrimGradient(kind)

    expect(locations[0]).toBe(0)
    expect(locations[3]).toBe(1)
    expect([...locations].sort((a, b) => a - b)).toEqual(locations)
  })

  it.each(ALL_KINDS)('uses the expected hero opacity for %s', (kind) => {
    expect(homeScrimGradient(kind).colors[0]).toMatch(new RegExp(`,${TOP_ALPHA[kind].replace('.', '\\.')}\\)$`))
  })

  it.each(ALL_KINDS)('gets progressively darker down the screen for %s', (kind) => {
    const alphas = homeScrimGradient(kind).colors.slice(0, 3).map((c) => Number(c.match(/,([\d.]+)\)$/)?.[1]))

    expect([...alphas].sort((a, b) => a - b)).toEqual(alphas)
  })

  it('treats snow and fog alike, and every cloudy variant alike', () => {
    expect(homeScrimGradient('snow')).toEqual(homeScrimGradient('fog'))
    expect(homeScrimGradient('partlyCloudyDay')).toEqual(homeScrimGradient('cloudy'))
    expect(homeScrimGradient('partlyCloudyNight')).toEqual(homeScrimGradient('cloudy'))
  })

  it('stays darkest for storms and clear nights', () => {
    const bottomAlpha = (kind: AmbientVisualKind): number =>
      Number(homeScrimGradient(kind).colors[2].match(/,([\d.]+)\)$/)?.[1])

    expect(bottomAlpha('thunder')).toBeGreaterThan(bottomAlpha('rain'))
    expect(bottomAlpha('clearNight')).toBeGreaterThan(bottomAlpha('clearDay'))
    expect(bottomAlpha('cloudy')).toBeLessThan(bottomAlpha('clearDay'))
  })
})
