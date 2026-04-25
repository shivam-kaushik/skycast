import { parseTimelineInstant } from '@/src/utils/timelineInstant'

/** Match WebView `buildFrameIndexes`: subsample Open-Meteo valid_times indices for animation frames. */
export function buildRadarDisplayFrameIndexes(totalCount: number, maxFrames: number): number[] {
  const frameCount = Math.min(totalCount, maxFrames)
  if (totalCount <= 0 || frameCount <= 0) return []
  if (totalCount <= frameCount) {
    return Array.from({ length: totalCount }, (_, i) => i)
  }
  const indexes: number[] = []
  const step = (totalCount - 1) / (frameCount - 1)
  for (let j = 0; j < frameCount; j++) {
    const idx = Math.round(j * step)
    if (indexes.length === 0 || indexes[indexes.length - 1] !== idx) {
      indexes.push(idx)
    }
  }
  return indexes
}

export type RadarTimelineRangeHours = 1 | 12

const HOUR_MS = 60 * 60 * 1000

/**
 * Lookback before `now` so at least one model step usually falls inside the window
 * (hourly ECMWF/ICON steps can sit just outside a tight 45–60 min margin).
 */
const LOOKBACK_1H_MS = 2 * HOUR_MS
const LOOKBACK_12H_MS = 3 * HOUR_MS

/** Small cushion past `now + hours` so a step ending exactly on the boundary is kept. */
const FORWARD_CUSHION_MS = 45 * 60 * 1000

/**
 * Indices into `valid_times` sorted by time: **current time through the next `hours`**
 * (with a short lookback so the latest analysis step near “now” is included).
 * This matches “1h / 12h forecast” UX instead of “last N hours before model end”.
 */
export function filterApiIndicesForwardFromNow(
  validTimes: string[],
  hours: RadarTimelineRangeHours,
  nowMs: number,
): number[] {
  const pairs: { i: number; t: number }[] = []
  for (let i = 0; i < validTimes.length; i++) {
    const d = parseTimelineInstant(validTimes[i] ?? '')
    if (d) pairs.push({ i, t: d.getTime() })
  }
  if (pairs.length === 0) return []

  const lookback = hours <= 1 ? LOOKBACK_1H_MS : LOOKBACK_12H_MS
  const forwardEnd = nowMs + hours * HOUR_MS + FORWARD_CUSHION_MS
  const winStart = nowMs - lookback

  let inWindow = pairs.filter((p) => p.t >= winStart && p.t <= forwardEnd)
  if (inWindow.length === 0) {
    inWindow = nearestPairsAroundNow(pairs, nowMs, hours)
  }
  return [...inWindow].sort((a, b) => a.t - b.t).map((p) => p.i)
}

function nearestPairsAroundNow(
  pairs: { i: number; t: number }[],
  nowMs: number,
  hours: RadarTimelineRangeHours,
): { i: number; t: number }[] {
  const chrono = [...pairs].sort((a, b) => a.t - b.t)
  let bestK = 0
  let bestDist = Infinity
  for (let k = 0; k < chrono.length; k++) {
    const d = Math.abs(chrono[k].t - nowMs)
    if (d < bestDist) {
      bestDist = d
      bestK = k
    }
  }
  const span = Math.max(hours * 4, 6)
  const start = Math.max(0, bestK - span)
  const end = Math.min(chrono.length, bestK + span + 1)
  return chrono.slice(start, end)
}

/**
 * @deprecated Prefer {@link filterApiIndicesForwardFromNow}. Kept for tests / fallback.
 * Indices within the last `hours` before the dataset’s latest time.
 */
export function filterApiIndicesWithinHoursBeforeLatest(
  validTimes: string[],
  hours: RadarTimelineRangeHours,
): number[] {
  if (validTimes.length === 0) return []
  const pairs: { i: number; t: number }[] = []
  for (let i = 0; i < validTimes.length; i++) {
    const d = parseTimelineInstant(validTimes[i] ?? '')
    if (d) pairs.push({ i, t: d.getTime() })
  }
  if (pairs.length === 0) return []
  const tMax = Math.max(...pairs.map((p) => p.t))
  const tMin = tMax - hours * HOUR_MS
  const inWindow = pairs.filter((p) => p.t >= tMin && p.t <= tMax)
  const chronological =
    inWindow.length > 0
      ? [...inWindow].sort((a, b) => a.t - b.t)
      : [...pairs].sort((a, b) => a.t - b.t)
  return chronological.map((p) => p.i)
}

/** Evenly subsample a chronologically ordered list of API indices (max `maxFrames` entries). */
export function subsampleChronologicalApiIndices(chronologicalApiIndices: number[], maxFrames: number): number[] {
  const n = chronologicalApiIndices.length
  if (n <= 0) return []
  if (n <= maxFrames) return [...chronologicalApiIndices]
  const out: number[] = []
  const step = (n - 1) / (maxFrames - 1)
  for (let j = 0; j < maxFrames; j++) {
    const k = Math.min(n - 1, Math.round(j * step))
    const v = chronologicalApiIndices[k]!
    if (out.length === 0 || out[out.length - 1] !== v) out.push(v)
  }
  return out
}

/** Subsampled API `valid_times` indices: next 1h or 12h from **now** (with lookback). */
export function buildDisplayFrameApiIndices(
  validTimes: string[],
  hours: RadarTimelineRangeHours,
  maxFrames: number,
  nowMs: number = Date.now(),
): number[] {
  let chronological = filterApiIndicesForwardFromNow(validTimes, hours, nowMs)
  if (chronological.length === 0) {
    chronological = filterApiIndicesWithinHoursBeforeLatest(validTimes, hours)
  }
  return subsampleChronologicalApiIndices(chronological, maxFrames)
}

/**
 * Nearest `valid_times` index to `nowMs` across the **entire** timeline (no forward / 12h window).
 * Used for static map layers and for initial frame selection on the full-model animation.
 */
export function singleApiIndexNearestInTimeline(
  validTimes: string[],
  nowMs: number = Date.now(),
): number | null {
  if (validTimes.length === 0) return null
  let bestIdx: number | null = null
  let bestDist = Infinity
  for (let i = 0; i < validTimes.length; i++) {
    const d = parseTimelineInstant(validTimes[i] ?? '')
    if (!d) continue
    const dist = Math.abs(d.getTime() - nowMs)
    if (dist < bestDist) {
      bestDist = dist
      bestIdx = i
    }
  }
  return bestIdx
}

/**
 * Animated radar frames: evenly subsample **full** `valid_times` (index 0 … last), matching the
 * stable behavior before the 1h/12h “forward from now” window. Does not depend on device clock
 * beyond optional initial-frame sync.
 */
export function buildFullModelDisplayFrameIndices(validTimesLength: number, maxFrames: number): number[] {
  return buildRadarDisplayFrameIndexes(validTimesLength, maxFrames)
}

/**
 * Single `valid_times` API index closest to `nowMs` within the forward window
 * (for layers that show one static map frame, no timeline).
 */
export function singleApiIndexNearestToNow(
  validTimes: string[],
  hours: RadarTimelineRangeHours,
  nowMs: number,
): number | null {
  let chronological = filterApiIndicesForwardFromNow(validTimes, hours, nowMs)
  if (chronological.length === 0) {
    chronological = filterApiIndicesWithinHoursBeforeLatest(validTimes, hours)
  }
  if (chronological.length === 0) return null
  let bestIdx = chronological[0]!
  let bestDist = Infinity
  for (const apiIdx of chronological) {
    const d = parseTimelineInstant(validTimes[apiIdx] ?? '')
    if (!d) continue
    const dist = Math.abs(d.getTime() - nowMs)
    if (dist < bestDist) {
      bestDist = dist
      bestIdx = apiIdx
    }
  }
  return bestIdx
}

/** Pick animation frame index whose label time is closest to `nowMs` (for map + scrubber sync). */
/**
 * Clamp Open-Meteo `valid_times_*` indices and drop duplicates (stale metadata / rounding).
 */
export function sanitizeOmFrameIndices(indices: readonly number[], validTimesLength: number): number[] {
  if (validTimesLength === 0) return []
  const max = Math.max(0, validTimesLength - 1)
  const out: number[] = []
  const seen = new Set<number>()
  for (const raw of indices) {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) continue
    const c = Math.min(Math.max(0, Math.floor(raw)), max)
    if (seen.has(c)) continue
    seen.add(c)
    out.push(c)
  }
  return out
}

/**
 * For each animation frame’s ISO label, pick the index into `secondaryValidTimes` whose instant is
 * closest in time. Use when a companion layer (e.g. cloud_cover) shares the model run but has its
 * own `valid_times` length — reusing primary tile indices would clamp many frames to one step.
 */
/** `data_spatial/<model>/` segment from an Open-Meteo map tile metadata URL. */
export function extractOpenMeteoSpatialModel(tileMetadataUrl: string): string | null {
  const m = tileMetadataUrl.match(/data_spatial\/([^/]+)\//)
  return m?.[1] ?? null
}

/**
 * Cloud `time_step` indices for each precip animation frame. Prefer raw tile indices when the
 * cloud dataset is the same model and shares the same `valid_times` length; otherwise map by time.
 */
export function buildCloudFrameIndicesForAnimation(
  displayIndexes: readonly number[],
  frameTimeLabels: readonly string[],
  tileValidTimesLength: number,
  cloudValidTimes: readonly string[],
  cloudValidTimesLength: number,
  tileSourceUrl: string,
  cloudSourceUrl: string,
): number[] {
  const cloudIdxMax = Math.max(0, cloudValidTimesLength - 1)
  const tileModel = extractOpenMeteoSpatialModel(tileSourceUrl)
  const cloudModel = extractOpenMeteoSpatialModel(cloudSourceUrl)
  const sameModel = tileModel !== null && tileModel === cloudModel
  const lenMatch =
    tileValidTimesLength === cloudValidTimesLength &&
    cloudValidTimes.length === cloudValidTimesLength &&
    cloudValidTimesLength > 0

  if (sameModel && lenMatch) {
    return displayIndexes.map((i) => Math.min(Math.max(0, Math.floor(i)), cloudIdxMax))
  }

  const times = cloudValidTimes.length > 0 ? cloudValidTimes : []
  return mapFrameLabelsToNearestValidTimesIndices(frameTimeLabels, times).map((i) =>
    Math.min(Math.max(0, Math.floor(i)), cloudIdxMax),
  )
}

export function mapFrameLabelsToNearestValidTimesIndices(
  frameTimeLabels: readonly string[],
  secondaryValidTimes: readonly string[],
): number[] {
  if (secondaryValidTimes.length === 0) {
    return frameTimeLabels.map(() => 0)
  }
  return frameTimeLabels.map((label) => {
    const t = parseTimelineInstant(label)
    if (!t) return 0
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < secondaryValidTimes.length; i++) {
      const d = parseTimelineInstant(secondaryValidTimes[i] ?? '')
      if (!d) continue
      const dist = Math.abs(d.getTime() - t.getTime())
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    }
    return best
  })
}

export function indexOfFrameNearestToNow(
  frameTimeLabels: readonly string[],
  nowMs: number = Date.now(),
): number {
  if (frameTimeLabels.length === 0) return 0
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < frameTimeLabels.length; i++) {
    const d = parseTimelineInstant(frameTimeLabels[i] ?? '')
    if (!d) continue
    const dist = Math.abs(d.getTime() - nowMs)
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  }
  return best
}
