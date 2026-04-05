import { useQuery } from '@tanstack/react-query'
import { getTileMetadataUrls, type MapLayer } from '@/src/components/radar/mapLayerConfig'
import { validateOpenMeteoValidTimesPayload } from '@/src/utils/openMeteoMapTileValidation'

const STALE_TIME = 5 * 60 * 1000
const REFETCH_INTERVAL = 10 * 60 * 1000
const RETRY = 2

type TileMetadataJson = {
  valid_times?: unknown
}

type OmeteoTileMetadata = {
  tileSourceUrl: string
  tileValidTimesLength: number
  /** ISO timestamps from Open-Meteo `valid_times` (same order as tile time_step indices) */
  validTimes: string[]
  cloudSourceUrl: string
  cloudValidTimesLength: number
  /** Same order as cloud tile `time_step=valid_times_*` (align animation by timestamp, not primary indices). */
  cloudValidTimes: string[]
  windVectorSourceUrl?: string
  windVectorValidTimesLength?: number
}

/** Normalize API values to ISO 8601 strings (handles Unix seconds / ms and numeric strings). */
function validTimeToIso(x: unknown): string {
  if (typeof x === 'number' && Number.isFinite(x)) {
    const ms = x > 1e12 ? x : x * 1000
    return new Date(ms).toISOString()
  }
  if (typeof x === 'string') {
    const t = x.trim()
    if (!t) return ''
    if (/^-?\d+(\.\d+)?$/.test(t)) {
      const n = Number(t)
      if (!Number.isFinite(n)) return t
      const ms = n > 1e12 ? n : n * 1000
      return new Date(ms).toISOString()
    }
    return t
  }
  return ''
}

function parseValidTimes(json: TileMetadataJson): string[] {
  const v = json.valid_times
  if (!Array.isArray(v)) return []
  return v.map((x) => {
    const iso = validTimeToIso(x)
    if (iso) return iso
    return typeof x === 'string' ? x : ''
  })
}

function getValidTimesLength(json: TileMetadataJson): number {
  return parseValidTimes(json).length
}

async function fetchValidTimes(url: string): Promise<string[]> {
  const res = await fetch(url)
  if (!res.ok) return []
  const json: unknown = await res.json()
  if (!validateOpenMeteoValidTimesPayload(json).ok) return []
  return parseValidTimes(json as TileMetadataJson)
}

async function fetchValidTimesLength(url: string): Promise<number> {
  const times = await fetchValidTimes(url)
  return times.length
}

async function selectFirstNonEmptySource(
  urls: string[],
): Promise<{ url: string; length: number; validTimes: string[] } | null> {
  for (const url of urls) {
    try {
      const validTimes = await fetchValidTimes(url)
      if (validTimes.length > 0) return { url, length: validTimes.length, validTimes }
    } catch (_) {
      // ignore and try next source
    }
  }
  return null
}

/** Prefer `cloud_cover` from the same spatial model as the selected tile (shared `valid_times`). */
function cloudMetadataCandidateUrls(tileUrl: string): string[] {
  const m = tileUrl.match(/data_spatial\/([^/]+)\//)
  const paired =
    m?.[1] != null
      ? `https://map-tiles.open-meteo.com/data_spatial/${m[1]}/latest.json?variable=cloud_cover`
      : null
  const fallbacks = [
    'https://map-tiles.open-meteo.com/data_spatial/ecmwf_ifs/latest.json?variable=cloud_cover',
    'https://map-tiles.open-meteo.com/data_spatial/dwd_icon/latest.json?variable=cloud_cover',
  ]
  const out: string[] = []
  if (paired) out.push(paired)
  for (const u of fallbacks) {
    if (!out.includes(u)) out.push(u)
  }
  return out
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

      const selectedCloud = await selectFirstNonEmptySource(cloudMetadataCandidateUrls(selectedTile.url))
      if (!selectedCloud) return null

      if (layer === 'wind') {
        const windVectorSourceUrl = deriveWindVectorSourceUrl(selectedTile.url)
        const windVectorValidTimesLength = await fetchValidTimesLength(windVectorSourceUrl)
        return {
          tileSourceUrl: selectedTile.url,
          tileValidTimesLength: selectedTile.length,
          validTimes: selectedTile.validTimes,
          cloudSourceUrl: selectedCloud.url,
          cloudValidTimesLength: selectedCloud.length,
          cloudValidTimes: selectedCloud.validTimes,
          windVectorSourceUrl,
          windVectorValidTimesLength,
        }
      }

      return {
        tileSourceUrl: selectedTile.url,
        tileValidTimesLength: selectedTile.length,
        validTimes: selectedTile.validTimes,
        cloudSourceUrl: selectedCloud.url,
        cloudValidTimesLength: selectedCloud.length,
        cloudValidTimes: selectedCloud.validTimes,
      }
    },
  })
}

