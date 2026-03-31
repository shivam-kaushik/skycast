import { useQuery } from '@tanstack/react-query'
import { getTileMetadataUrls, type MapLayer } from '@/src/components/radar/mapLayerConfig'

const STALE_TIME = 5 * 60 * 1000
const REFETCH_INTERVAL = 10 * 60 * 1000
const RETRY = 2

type TileMetadataJson = {
  valid_times?: unknown
}

type OmeteoTileMetadata = {
  tileSourceUrl: string
  tileValidTimesLength: number
  cloudSourceUrl: string
  cloudValidTimesLength: number
  windVectorSourceUrl?: string
  windVectorValidTimesLength?: number
}

function getValidTimesLength(json: TileMetadataJson): number {
  const v = json.valid_times
  if (!Array.isArray(v)) return 0
  return v.length
}

async function fetchValidTimesLength(url: string): Promise<number> {
  const res = await fetch(url)
  if (!res.ok) return 0
  const json = (await res.json()) as TileMetadataJson
  return getValidTimesLength(json)
}

async function selectFirstNonEmptySource(urls: string[]): Promise<{ url: string; length: number } | null> {
  // Sequential to keep logic simple and avoid unnecessary concurrent load.
  for (const url of urls) {
    try {
      const length = await fetchValidTimesLength(url)
      if (length > 0) return { url, length }
    } catch (_) {
      // ignore and try next source
    }
  }
  return null
}

function deriveWindVectorSourceUrl(rasterSourceUrl: string): string {
  // Raster source URL contains `variable=<something>`. We swap it to U-component for directional arrows.
  let windVectorSourceUrl = rasterSourceUrl.replace(/variable=[^&]+/, 'variable=wind_u_component_10m')
  if (windVectorSourceUrl.indexOf('arrows=true') === -1) {
    windVectorSourceUrl = `${windVectorSourceUrl}&arrows=true`
  }
  return windVectorSourceUrl
}

export function useOmeteoMapTileMetadata(layer: MapLayer, options?: { enabled?: boolean }) {
  return useQuery<OmeteoTileMetadata | null>({
    queryKey: ['omTileMeta', layer],
    enabled: options?.enabled ?? true,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    retry: RETRY,
    queryFn: async () => {
      const tileCandidates = getTileMetadataUrls(layer)
      const selectedTile = await selectFirstNonEmptySource(tileCandidates)
      if (!selectedTile) return null

      const cloudCandidates = [
        'https://map-tiles.open-meteo.com/data_spatial/ecmwf_ifs/latest.json?variable=cloud_cover',
        'https://map-tiles.open-meteo.com/data_spatial/dwd_icon/latest.json?variable=cloud_cover',
      ]
      const selectedCloud = await selectFirstNonEmptySource(cloudCandidates)
      if (!selectedCloud) return null

      if (layer === 'wind') {
        const windVectorSourceUrl = deriveWindVectorSourceUrl(selectedTile.url)
        const windVectorValidTimesLength = await fetchValidTimesLength(windVectorSourceUrl)
        return {
          tileSourceUrl: selectedTile.url,
          tileValidTimesLength: selectedTile.length,
          cloudSourceUrl: selectedCloud.url,
          cloudValidTimesLength: selectedCloud.length,
          windVectorSourceUrl,
          windVectorValidTimesLength,
        }
      }

      return {
        tileSourceUrl: selectedTile.url,
        tileValidTimesLength: selectedTile.length,
        cloudSourceUrl: selectedCloud.url,
        cloudValidTimesLength: selectedCloud.length,
      }
    },
  })
}

