import { buildMapHTML } from '@/src/components/radar/WeatherMapView'
import { getTileMetadataUrls } from '@/src/components/radar/mapLayerConfig'

describe('radar tile metadata mapping', () => {
  it('resolves each layer to live Open-Meteo S3 tile metadata URLs', () => {
    expect(getTileMetadataUrls('precipitation')).toEqual([
      'https://openmeteo.s3.amazonaws.com/data_spatial/ecmwf_ifs/latest.json?variable=precipitation',
      'https://openmeteo.s3.amazonaws.com/data_spatial/dwd_icon/latest.json?variable=precipitation',
    ])
    expect(getTileMetadataUrls('temperature')).toEqual([
      'https://openmeteo.s3.amazonaws.com/data_spatial/ecmwf_ifs/latest.json?variable=temperature_2m',
      'https://openmeteo.s3.amazonaws.com/data_spatial/dwd_icon/latest.json?variable=temperature_2m',
    ])
    expect(getTileMetadataUrls('wind')).toEqual([
      'https://openmeteo.s3.amazonaws.com/data_spatial/ecmwf_ifs/latest.json?variable=wind_gusts_10m',
      'https://openmeteo.s3.amazonaws.com/data_spatial/dwd_icon/latest.json?variable=wind_gusts_10m',
    ])
    expect(getTileMetadataUrls('air')).toEqual([
      'https://openmeteo.s3.amazonaws.com/data_spatial/cams_global/latest.json?variable=us_aqi',
      'https://openmeteo.s3.amazonaws.com/data_spatial/cams_europe/latest.json?variable=us_aqi',
    ])
  })

  it('never points back at the dead map-tiles CDN host', () => {
    for (const layer of ['precipitation', 'temperature', 'wind', 'air'] as const) {
      for (const url of getTileMetadataUrls(layer)) {
        expect(url).not.toContain('map-tiles.open-meteo.com')
        expect(url).toContain('openmeteo.s3.amazonaws.com')
      }
    }
  })
})

describe('buildMapHTML', () => {
  const overlay = {
    temperature: 19,
    windSpeed: 15,
    windDirection: 90,
    windGusts: 25,
    usAqi: 42,
    feelsLike: 18,
  }

  const baseParams = {
    tileSourceUrl: 'https://openmeteo.s3.amazonaws.com/data_spatial/ecmwf_ifs/latest.json?variable=precipitation',
    tileValidTimesLength: 48,
    cloudSourceUrl: 'https://openmeteo.s3.amazonaws.com/data_spatial/ecmwf_ifs/latest.json?variable=cloud_cover',
    cloudValidTimesLength: 48,
    frameIndices: [0, 1, 2, 3],
    cloudFrameIndices: [0, 1, 2, 3],
    initialFrameIndex: 0,
  }

  const frameTimeLabels = ['2026-09-20T00:00Z', '2026-09-20T01:00Z', '2026-09-20T02:00Z', '2026-09-20T03:00Z']

  it.each(['precipitation', 'temperature', 'wind', 'air'] as const)(
    'builds valid animated map HTML for the %s layer',
    (layer) => {
      const html = buildMapHTML(43.65, -79.38, layer, overlay, baseParams, frameTimeLabels)

      expect(html).toContain("var LAYER = '" + layer + "';")
      expect(html).toContain('openmeteo/mapbox-layer')
      expect(html).toContain('setupAnimatedOverlay')
      expect(html).not.toContain('map-tiles.open-meteo.com')
    },
  )

  it('wires wind vector params only for the wind layer', () => {
    const html = buildMapHTML(43.65, -79.38, 'wind', overlay, {
      ...baseParams,
      windVectorSourceUrl: 'https://openmeteo.s3.amazonaws.com/data_spatial/ecmwf_ifs/latest.json?variable=wind_u_component_10m',
      windVectorValidTimesLength: 48,
    }, frameTimeLabels)

    expect(html).toContain('WIND_VECTOR_SOURCE_URL')
    expect(html).toContain('createVectorTileLayer')
  })

  it('generates valid JavaScript for the animated map', () => {
    const html = buildMapHTML(43.65, -79.38, 'precipitation', overlay, baseParams, frameTimeLabels)
    const script = html.match(/<script>\n([\s\S]*?)\n<\/script>/)?.[1]

    expect(script).toBeDefined()
    expect(() => new Function(script!)).not.toThrow()
  })
})
