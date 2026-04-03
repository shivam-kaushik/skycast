import {
  buildDisplayFrameApiIndices,
  filterApiIndicesForwardFromNow,
  filterApiIndicesWithinHoursBeforeLatest,
  indexOfFrameNearestToNow,
  singleApiIndexNearestToNow,
  subsampleChronologicalApiIndices,
} from '@/src/utils/radarFrameIndexes'

describe('filterApiIndicesForwardFromNow', () => {
  it('selects instants from a short lookback through now + N hours', () => {
    const now = Date.parse('2026-04-01T15:00:00.000Z')
    const validTimes = [
      new Date(now - 3 * 3600000).toISOString(),
      new Date(now - 30 * 60000).toISOString(),
      new Date(now + 2 * 3600000).toISOString(),
      new Date(now + 8 * 3600000).toISOString(),
      new Date(now + 20 * 3600000).toISOString(),
    ]
    const idx = filterApiIndicesForwardFromNow(validTimes, 12, now)
    expect(idx).toContain(1)
    expect(idx).toContain(2)
    expect(idx).toContain(3)
    expect(idx).not.toContain(0)
    expect(idx).not.toContain(4)
  })
})

describe('filterApiIndicesWithinHoursBeforeLatest', () => {
  it('keeps only instants within 1h before the latest time', () => {
    const base = Date.parse('2026-04-01T12:00:00.000Z')
    const validTimes = [
      new Date(base - 3 * 3600000).toISOString(),
      new Date(base - 2 * 3600000).toISOString(),
      new Date(base - 90 * 60000).toISOString(),
      new Date(base - 30 * 60000).toISOString(),
      new Date(base).toISOString(),
    ]
    const idx = filterApiIndicesWithinHoursBeforeLatest(validTimes, 1)
    // 90m before latest is outside the last 60m; keep 30m + now
    expect(idx).toEqual([3, 4])
  })

  it('includes full chronological span for 12h when all fit', () => {
    const base = Date.parse('2026-04-01T12:00:00.000Z')
    const validTimes = [
      new Date(base - 10 * 3600000).toISOString(),
      new Date(base - 5 * 3600000).toISOString(),
      new Date(base).toISOString(),
    ]
    const idx = filterApiIndicesWithinHoursBeforeLatest(validTimes, 12)
    expect(idx).toEqual([0, 1, 2])
  })
})

describe('subsampleChronologicalApiIndices', () => {
  it('returns all when under max', () => {
    expect(subsampleChronologicalApiIndices([1, 2, 3], 8)).toEqual([1, 2, 3])
  })

  it('subsamples evenly', () => {
    const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    const out = subsampleChronologicalApiIndices(arr, 3)
    expect(out.length).toBe(3)
    expect(out[0]).toBe(0)
    expect(out[out.length - 1]).toBe(9)
  })
})

describe('buildDisplayFrameApiIndices', () => {
  it('combines filter and subsample', () => {
    const base = Date.parse('2026-04-01T18:00:00.000Z')
    const validTimes = Array.from({ length: 24 }, (_, i) =>
      new Date(base - (23 - i) * 3600000).toISOString(),
    )
    const one = buildDisplayFrameApiIndices(validTimes, 1, 4, base)
    expect(one.length).toBeLessThanOrEqual(4)
    const twelve = buildDisplayFrameApiIndices(validTimes, 12, 8, base)
    expect(twelve.length).toBeLessThanOrEqual(8)
    expect(new Set(twelve).size).toBe(twelve.length)
  })
})

describe('singleApiIndexNearestToNow', () => {
  it('returns the API index whose time is closest to now within the window', () => {
    const now = Date.parse('2026-04-01T15:00:00.000Z')
    const validTimes = [
      new Date(now - 2 * 3600000).toISOString(),
      new Date(now + 1 * 3600000).toISOString(),
      new Date(now + 6 * 3600000).toISOString(),
    ]
    const idx = singleApiIndexNearestToNow(validTimes, 12, now)
    expect(idx).toBe(1)
  })
})

describe('indexOfFrameNearestToNow', () => {
  it('returns index of label closest to now', () => {
    const now = Date.parse('2026-04-01T14:05:00.000Z')
    const labels = [
      '2026-04-01T12:00:00.000Z',
      '2026-04-01T14:00:00.000Z',
      '2026-04-01T18:00:00.000Z',
    ]
    expect(indexOfFrameNearestToNow(labels, now)).toBe(1)
  })
})
