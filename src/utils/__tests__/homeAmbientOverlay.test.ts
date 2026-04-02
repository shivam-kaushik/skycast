import { homeScrimGradient } from '@/src/utils/homeAmbientOverlay'

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
})
