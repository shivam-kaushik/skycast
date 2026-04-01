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
 * Indices into `valid_times` (API order) sorted chronologically, keeping only instants
 * within `hours` before the latest valid time in the dataset.
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

/** Subsampled API `valid_times` indices for the map, honoring 1h vs 12h window. */
export function buildDisplayFrameApiIndices(
  validTimes: string[],
  hours: RadarTimelineRangeHours,
  maxFrames: number,
): number[] {
  const chronological = filterApiIndicesWithinHoursBeforeLatest(validTimes, hours)
  return subsampleChronologicalApiIndices(chronological, maxFrames)
}
