import {
  buildCloudFrameIndicesForAnimation,
  buildDisplayFrameApiIndices,
  buildFullModelDisplayFrameIndices,
  extractOpenMeteoSpatialModel,
  filterApiIndicesForwardFromNow,
  filterApiIndicesWithinHoursBeforeLatest,
  indexOfFrameNearestToNow,
  mapFrameLabelsToNearestValidTimesIndices,
  sanitizeOmFrameIndices,
  singleApiIndexNearestInTimeline,
  singleApiIndexNearestToNow,
  subsampleChronologicalApiIndices,
} from '@/src/utils/radarFrameIndexes'

describe('filterApiIndicesForwardFromNow', () => {
  it('selects instants from a short lookback through now + N hours', () => {
    const now = Date.parse('2026-04-01T15:00:00.000Z')
    const validTimes = [
      new Date(now - 5 * 3600000).toISOString(),
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

describe('sanitizeOmFrameIndices', () => {
  it('clamps, floors, and dedupes in order', () => {
    expect(sanitizeOmFrameIndices([-1, 2.9, 2.9, 99], 5)).toEqual([0, 2, 4])
  })

  it('returns empty when length is 0', () => {
    expect(sanitizeOmFrameIndices([0, 1], 0)).toEqual([])
  })
})

describe('buildFullModelDisplayFrameIndices', () => {
  it('subsamples the full timeline without empty result for typical lengths', () => {
    const raw = buildFullModelDisplayFrameIndices(109, 8)
    const cleaned = sanitizeOmFrameIndices(raw, 109)
    expect(cleaned.length).toBeGreaterThan(0)
    expect(cleaned[0]).toBe(0)
    expect(cleaned[cleaned.length - 1]).toBe(108)
  })
})

describe('singleApiIndexNearestInTimeline', () => {
  it('picks the index closest to now', () => {
    const now = Date.parse('2026-04-01T15:30:00.000Z')
    const validTimes = [
      '2026-04-01T12:00:00.000Z',
      '2026-04-01T15:00:00.000Z',
      '2026-04-01T18:00:00.000Z',
    ]
    expect(singleApiIndexNearestInTimeline(validTimes, now)).toBe(1)
  })
})

describe('extractOpenMeteoSpatialModel', () => {
  it('reads the data_spatial model segment', () => {
    expect(
      extractOpenMeteoSpatialModel(
        'https://map-tiles.open-meteo.com/data_spatial/dwd_icon/latest.json?variable=precipitation',
      ),
    ).toBe('dwd_icon')
  })
})

describe('buildCloudFrameIndicesForAnimation', () => {
  it('reuses tile indices when same model and matching valid_times length', () => {
    const url =
      'https://map-tiles.open-meteo.com/data_spatial/ecmwf_ifs/latest.json?variable=precipitation'
    const cloudUrl =
      'https://map-tiles.open-meteo.com/data_spatial/ecmwf_ifs/latest.json?variable=cloud_cover'
    const vt = Array.from({ length: 20 }, (_, i) => new Date(1_700_000_000_000 + i * 3600000).toISOString())
    const idx = [2, 5, 9]
    const labels = idx.map((i) => vt[i] ?? '')
    expect(
      buildCloudFrameIndicesForAnimation(idx, labels, vt.length, vt, vt.length, url, cloudUrl),
    ).toEqual([2, 5, 9])
  })

  it('falls back to time mapping when models differ', () => {
    const tileUrl =
      'https://map-tiles.open-meteo.com/data_spatial/dwd_icon/latest.json?variable=precipitation'
    const cloudUrl =
      'https://map-tiles.open-meteo.com/data_spatial/ecmwf_ifs/latest.json?variable=cloud_cover'
    const precipT = ['2026-04-01T12:00:00.000Z', '2026-04-01T15:00:00.000Z']
    const cloudT = ['2026-04-01T11:00:00.000Z', '2026-04-01T12:00:00.000Z', '2026-04-01T15:00:00.000Z']
    expect(
      buildCloudFrameIndicesForAnimation([10, 11], precipT, 100, cloudT, cloudT.length, tileUrl, cloudUrl),
    ).toEqual([1, 2])
  })
})

describe('mapFrameLabelsToNearestValidTimesIndices', () => {
  it('maps each frame label to the nearest secondary valid_times index', () => {
    const cloud = [
      '2026-04-01T10:00:00.000Z',
      '2026-04-01T12:00:00.000Z',
      '2026-04-01T14:00:00.000Z',
    ]
    const precipLabels = ['2026-04-01T11:30:00.000Z', '2026-04-01T13:45:00.000Z']
    expect(mapFrameLabelsToNearestValidTimesIndices(precipLabels, cloud)).toEqual([1, 2])
  })

  it('avoids clamping many precip steps to one cloud index when lengths differ', () => {
    const cloud = Array.from({ length: 5 }, (_, i) =>
      new Date(Date.parse('2026-04-01T12:00:00.000Z') + i * 3600000).toISOString(),
    )
    const precipLabels = [
      new Date(Date.parse('2026-04-01T12:00:00.000Z') + 0 * 3600000).toISOString(),
      new Date(Date.parse('2026-04-01T12:00:00.000Z') + 2 * 3600000).toISOString(),
      new Date(Date.parse('2026-04-01T12:00:00.000Z') + 4 * 3600000).toISOString(),
    ]
    const rawPrecipIndicesWouldClamp = [50, 52, 54]
    expect(rawPrecipIndicesWouldClamp.every((i) => Math.min(i, cloud.length - 1) === cloud.length - 1)).toBe(
      true,
    )
    expect(mapFrameLabelsToNearestValidTimesIndices(precipLabels, cloud)).toEqual([0, 2, 4])
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
