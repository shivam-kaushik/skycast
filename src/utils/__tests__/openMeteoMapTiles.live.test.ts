/**
 * Network integration: verifies Open-Meteo map-tiles endpoints return usable metadata.
 *
 * Run manually when online:
 *   npx jest src/utils/__tests__/openMeteoMapTiles.live.test.ts
 *
 * Skipped unless OM_LIVE_MAP_TEST=1 (avoids flaky CI).
 */
import { validateOpenMeteoValidTimesPayload } from '@/src/utils/openMeteoMapTileValidation'
import { buildFullModelDisplayFrameIndices, sanitizeOmFrameIndices } from '@/src/utils/radarFrameIndexes'

const PRECIP_META =
  'https://map-tiles.open-meteo.com/data_spatial/ecmwf_ifs/latest.json?variable=precipitation'

const runLive = process.env.OM_LIVE_MAP_TEST === '1'

;(runLive ? describe : describe.skip)('Open-Meteo map tiles (live network)', () => {
  it('precipitation metadata has non-empty valid_times', async () => {
    const res = await fetch(PRECIP_META)
    expect(res.ok).toBe(true)
    const json: unknown = await res.json()
    const check = validateOpenMeteoValidTimesPayload(json)
    expect(check.ok).toBe(true)
    if (!check.ok) throw new Error(check.reason)
    const indices = sanitizeOmFrameIndices(buildFullModelDisplayFrameIndices(check.count, 8), check.count)
    expect(indices.length).toBeGreaterThan(0)
  })
})
