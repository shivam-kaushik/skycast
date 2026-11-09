import { buildGlobeHTML, type GlobeLayer, type GlobeWeatherData } from '@/src/components/radar/buildGlobeHTML'

const WEATHER: GlobeWeatherData = {
  temperature: 21.6,
  precipitationProbability: 35,
  windSpeed: 14.4,
  windDirection: 270,
  usAqi: 42,
  conditionLabel: 'Slight Rain',
}

/** The JSON blob assigned to `var D = …;` inside the inline script. */
function injectedData(html: string): Record<string, unknown> {
  const match = html.match(/var D = (\{.*?\});\n/)
  if (!match?.[1]) throw new Error('injected data blob not found')
  return JSON.parse(match[1]) as Record<string, unknown>
}

describe('buildGlobeHTML', () => {
  it('returns a complete HTML document that loads globe.gl', () => {
    const html = buildGlobeHTML(43.65, -79.38, 'precipitation', WEATHER)

    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('globe.gl')
    expect(html).toContain('id="globe"')
  })

  it('injects the location, layer and rounded readings as a single JSON blob', () => {
    const html = buildGlobeHTML(43.65, -79.38, 'wind', WEATHER)

    expect(injectedData(html)).toEqual({
      lat: 43.65,
      lon: -79.38,
      layer: 'wind',
      temp: 22,
      precip: 35,
      wind: 14,
      windDir: 270,
      aqi: 42,
      cond: 'Slight Rain',
    })
  })

  it.each(['precipitation', 'temperature', 'wind', 'air'] as GlobeLayer[])('embeds the %s layer', (layer) => {
    expect(injectedData(buildGlobeHTML(0, 0, layer, WEATHER)).layer).toBe(layer)
  })

  it('escapes hostile condition text so it cannot break out of the script', () => {
    const html = buildGlobeHTML(0, 0, 'air', { ...WEATHER, conditionLabel: '"};alert(1);//' })

    expect(injectedData(html).cond).toBe('"};alert(1);//')
  })

  it('produces syntactically valid JavaScript', () => {
    const html = buildGlobeHTML(43.65, -79.38, 'temperature', WEATHER)
    const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!)

    expect(inlineScripts.length).toBeGreaterThan(0)
    for (const script of inlineScripts) expect(() => new Function(script)).not.toThrow()
  })
})
