import { buildMapHTML } from '@/src/components/radar/WeatherMapView'
import { getTileMetadataUrls } from '@/src/components/radar/mapLayerConfig'

describe('radar tile metadata mapping', () => {
  it('maps precipitation to global ecmwf_ifs precipitation variable', () => {
    expect(getTileMetadataUrls('precipitation')[0]).toContain('/data_spatial/ecmwf_ifs/latest.json?variable=precipitation')
  })

  it('maps air layer to cams_global us_aqi variable', () => {
    expect(getTileMetadataUrls('air')[0]).toContain('/data_spatial/cams_global/latest.json?variable=us_aqi')
  })
})

describe('buildMapHTML', () => {
  it('embeds selected tile metadata URL and layer key', () => {
    const urls = getTileMetadataUrls('wind')
    const tileSourceUrl = urls[0]!
    const windVectorSourceUrl =
      tileSourceUrl.replace(/wind_gusts_10m/, 'wind_u_component_10m') + '&arrows=true'
    const cloudSourceUrl = 'https://map-tiles.open-meteo.com/data_spatial/ecmwf_ifs/latest.json?variable=cloud_cover'
    const html = buildMapHTML(
      43.65,
      -79.38,
      'wind',
      {
        temperature: 19,
        windSpeed: 15,
        windDirection: 90,
        windGusts: 25,
        usAqi: 42,
        feelsLike: 18,
      },
      {
        tileSourceUrl,
        tileValidTimesLength: 12,
        cloudSourceUrl,
        cloudValidTimesLength: 12,
        windVectorSourceUrl,
        windVectorValidTimesLength: 12,
      },
    )

    expect(html).toContain("var LAYER = 'wind';")
    expect(html).toContain(`var TILE_SOURCE_URL = '${tileSourceUrl}';`)
    expect(html).toContain('var TILE_VALID_TIMES_COUNT = 12;')
    expect(html).toContain('addLeafletProtocolSupport')
  })
})
