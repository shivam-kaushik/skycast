import { useQuery } from '@tanstack/react-query'
import { getTileMetadataUrls, type MapLayer } from '@/src/components/radar/mapLayerConfig'
import { validateOpenMeteoValidTimesPayload } from '@/src/utils/openMeteoMapTileValidation'
import { logger } from '@/src/utils/logger'

const STALE_TIME = 5 * 60 * 1000
const REFETCH_INTERVAL = 10 * 60 * 1000
const RETRY = 2

type TileMetadataJson = {
  valid_times?: unknown
  reference_time?: unknown
}

type OmeteoTileMetadata = {
  tileSourceUrl: string
  tileValidTimesLength: number
  /** ISO timestamps from Open-Meteo `valid_times` (same order as tile time_step indices) */
  validTimes: string[]
  /** ISO reference time (model run time) for the tile source, used to build pre-resolved .om URLs. */
  referenceTime: string
  cloudSourceUrl: string
  cloudValidTimesLength: number
  /** Same order as cloud tile `time_step=valid_times_*` (align animation by timestamp, not primary indices). */
  cloudValidTimes: string[]
  /** ISO reference time for the cloud source. */
  cloudReferenceTime: string
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

async function fetchTileMetadata(url: string): Promise<{ validTimes: string[]; referenceTime: string }> {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      logger.warn('map.metadata', 'tile metadata request failed', { url, status: res.status, statusText: res.statusText })
      return { validTimes: [], referenceTime: '' }
    }
    const json: unknown = await res.json()
    if (!validateOpenMeteoValidTimesPayload(json).ok) {
      logger.warn('map.metadata', 'tile metadata payload rejected', { url, validation: 'invalid-shape' })
      return { validTimes: [], referenceTime: '' }
    }
    const parsed = json as TileMetadataJson
    const validTimes = parseValidTimes(parsed)
    const referenceTime = validTimeToIso(parsed.reference_time)
    logger.info('map.metadata', 'tile metadata loaded', { url, count: validTimes.length })
    return { validTimes, referenceTime }
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown map metadata failure')
    logger.error('map.metadata', err, { url })
    return { validTimes: [], referenceTime: '' }
  }
}

async function fetchValidTimesLength(url: string): Promise<number> {
  const { validTimes } = await fetchTileMetadata(url)
  return validTimes.length
}

async function selectFirstNonEmptySource(
  urls: string[],
): Promise<{ url: string; length: number; validTimes: string[]; referenceTime: string } | null> {
  for (const url of urls) {
    try {
      const { validTimes, referenceTime } = await fetchTileMetadata(url)
      if (validTimes.length > 0) return { url, length: validTimes.length, validTimes, referenceTime }
    } catch (_) {
      // ignore and try next source
    }
  }
  return null
}

/**
 * Prefer `cloud_cover` from the same spatial model as the selected tile (shared `valid_times`).
 * Served from Open-Meteo's public AWS bucket — the old `map-tiles.open-meteo.com` CDN host is dead.
 */
function cloudMetadataCandidateUrls(tileUrl: string): string[] {
  const m = tileUrl.match(/data_spatial\/([^/]+)\//)
  const paired =
    m?.[1] != null
      ? `https://openmeteo.s3.amazonaws.com/data_spatial/${m[1]}/latest.json?variable=cloud_cover`
      : null
  const fallbacks = [
    'https://openmeteo.s3.amazonaws.com/data_spatial/ecmwf_ifs/latest.json?variable=cloud_cover',
    'https://openmeteo.s3.amazonaws.com/data_spatial/dwd_icon/latest.json?variable=cloud_cover',
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
      logger.info('map.metadata', 'requesting tile metadata', { layer, candidateCount: tileCandidates.length })
      const selectedTile = await selectFirstNonEmptySource(tileCandidates)
      if (!selectedTile) {
        logger.warn('map.metadata', 'no usable tile source found', { layer, candidates: tileCandidates })
        return null
      }

      const selectedCloud = await selectFirstNonEmptySource(cloudMetadataCandidateUrls(selectedTile.url))
      if (!selectedCloud) {
        logger.warn('map.metadata', 'no usable cloud source found', { layer, tileUrl: selectedTile.url })
        return null
      }

      if (layer === 'wind') {
        const windVectorSourceUrl = deriveWindVectorSourceUrl(selectedTile.url)
        const windVectorValidTimesLength = await fetchValidTimesLength(windVectorSourceUrl)
        return {
          tileSourceUrl: selectedTile.url,
          tileValidTimesLength: selectedTile.length,
          validTimes: selectedTile.validTimes,
          referenceTime: selectedTile.referenceTime,
          cloudSourceUrl: selectedCloud.url,
          cloudValidTimesLength: selectedCloud.length,
          cloudValidTimes: selectedCloud.validTimes,
          cloudReferenceTime: selectedCloud.referenceTime,
          windVectorSourceUrl,
          windVectorValidTimesLength,
        }
      }

      return {
        tileSourceUrl: selectedTile.url,
        tileValidTimesLength: selectedTile.length,
        validTimes: selectedTile.validTimes,
        referenceTime: selectedTile.referenceTime,
        cloudSourceUrl: selectedCloud.url,
        cloudValidTimesLength: selectedCloud.length,
        cloudValidTimes: selectedCloud.validTimes,
        cloudReferenceTime: selectedCloud.referenceTime,
      }
    },
  })
}

