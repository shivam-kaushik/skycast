import { FREE_MAP_BASE_URLS, getTileMetadataUrls, MAP_TILE_CONFIG, type MapLayer } from '@/src/components/radar/mapLayerConfig'

const LAYERS: MapLayer[] = ['precipitation', 'temperature', 'wind', 'air']

describe('MAP_TILE_CONFIG', () => {
  it.each(LAYERS)('defines a primary source and at least one fallback for %s', (layer) => {
    expect(MAP_TILE_CONFIG[layer].length).toBeGreaterThanOrEqual(2)
    for (const source of MAP_TILE_CONFIG[layer]) {
      expect(source.model).toMatch(/^[a-z0-9_]+$/)
      expect(source.variable).toMatch(/^[a-z0-9_]+$/)
    }
  })

  it('maps each layer to the Open-Meteo variable it visualizes', () => {
    expect(MAP_TILE_CONFIG.precipitation.map((s) => s.variable)).toEqual(['precipitation', 'precipitation'])
    expect(MAP_TILE_CONFIG.temperature.map((s) => s.variable)).toEqual(['temperature_2m', 'temperature_2m'])
    expect(MAP_TILE_CONFIG.wind.map((s) => s.variable)).toEqual(['wind_gusts_10m', 'wind_gusts_10m'])
    expect(MAP_TILE_CONFIG.air.map((s) => s.variable)).toEqual(['us_aqi', 'us_aqi'])
  })

  it('uses air-quality (CAMS) models for the air layer and weather models elsewhere', () => {
    expect(MAP_TILE_CONFIG.air.map((s) => s.model)).toEqual(['cams_global', 'cams_europe'])
    for (const layer of ['precipitation', 'temperature', 'wind'] as const) {
      expect(MAP_TILE_CONFIG[layer].map((s) => s.model)).toEqual(['ecmwf_ifs', 'dwd_icon'])
    }
  })
})

describe('getTileMetadataUrls', () => {
  it.each(LAYERS)('builds one latest.json URL per source for %s, preserving priority order', (layer) => {
    const urls = getTileMetadataUrls(layer)

    expect(urls).toHaveLength(MAP_TILE_CONFIG[layer].length)
    urls.forEach((url, i) => {
      const { model, variable } = MAP_TILE_CONFIG[layer][i]!
      expect(url).toBe(`https://openmeteo.s3.amazonaws.com/data_spatial/${model}/latest.json?variable=${variable}`)
    })
  })

  it('never targets the retired map-tiles CDN host', () => {
    for (const layer of LAYERS) {
      for (const url of getTileMetadataUrls(layer)) expect(url).not.toContain('map-tiles.open-meteo.com')
    }
  })
})

describe('FREE_MAP_BASE_URLS', () => {
  it('points at the OpenStreetMap standard tile template', () => {
    expect(FREE_MAP_BASE_URLS.standard).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png')
  })
})
