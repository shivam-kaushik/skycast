export type MapLayer = 'precipitation' | 'temperature' | 'wind' | 'air'

export interface MapTileConfig {
  model: string
  variable: string
}

export const MAP_TILE_CONFIG: Record<MapLayer, MapTileConfig[]> = {
  /** Model precipitation field — `valid_times` include forecast hours (use for “next 12h” animation). */
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

export function getTileMetadataUrls(layer: MapLayer): string[] {
  return MAP_TILE_CONFIG[layer].map(
    (config) =>
      `https://map-tiles.open-meteo.com/data_spatial/${config.model}/latest.json?variable=${config.variable}`,
  )
}
