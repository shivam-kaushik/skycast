export type MapLayer = 'precipitation' | 'temperature' | 'wind' | 'air'

export interface MapTileConfig {
  model: string
  variable: string
}

export const MAP_TILE_CONFIG: Record<MapLayer, MapTileConfig[]> = {
  /** Model precipitation field — `valid_times` include forecast hours (use for "next 12h" animation). */
  precipitation: [
    { model: 'ecmwf_ifs', variable: 'precipitation' },
    { model: 'dwd_icon', variable: 'precipitation' },
  ],
  /** 2 m temperature — map tiles step through `valid_times` (forecast hours). */
  temperature: [
    { model: 'ecmwf_ifs', variable: 'temperature_2m' },
    { model: 'dwd_icon', variable: 'temperature_2m' },
  ],
  /** Wind gusts + vector arrows — same forecast timeline as other spatial layers. */
  wind: [
    { model: 'ecmwf_ifs', variable: 'wind_gusts_10m' },
    { model: 'dwd_icon', variable: 'wind_gusts_10m' },
  ],
  /** CAMS US AQI — forecast fields on the map timeline. */
  air: [
    { model: 'cams_global', variable: 'us_aqi' },
    { model: 'cams_europe', variable: 'us_aqi' },
  ],
}

/**
 * Open-Meteo's spatial tile metadata is served from their public AWS Open Data bucket.
 * The old `map-tiles.open-meteo.com` CDN host no longer resolves — this bucket is the
 * live replacement and needs no credentials (same free/keyless model as the rest of the API).
 */
const DATA_SPATIAL_BASE_URL = 'https://openmeteo.s3.amazonaws.com/data_spatial'

export const FREE_MAP_BASE_URLS = {
  standard: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
}

export function getTileMetadataUrls(layer: MapLayer): string[] {
  return MAP_TILE_CONFIG[layer].map(
    (config) => `${DATA_SPATIAL_BASE_URL}/${config.model}/latest.json?variable=${config.variable}`,
  )
}
