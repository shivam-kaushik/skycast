import { useOmeteoMapTileMetadata } from '@/src/hooks/useOmeteoMapTileMetadata'
import { renderHookWithQueryClient, waitFor } from '@/src/utils/testHookHarness'

jest.mock('@/src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

const BASE = 'https://openmeteo.s3.amazonaws.com/data_spatial'
const ECMWF_PRECIP = `${BASE}/ecmwf_ifs/latest.json?variable=precipitation`
const DWD_PRECIP = `${BASE}/dwd_icon/latest.json?variable=precipitation`
const ECMWF_WIND = `${BASE}/ecmwf_ifs/latest.json?variable=wind_gusts_10m`
const ECMWF_WIND_VECTOR = `${BASE}/ecmwf_ifs/latest.json?variable=wind_u_component_10m&arrows=true`
const ECMWF_CLOUD = `${BASE}/ecmwf_ifs/latest.json?variable=cloud_cover`
const DWD_CLOUD = `${BASE}/dwd_icon/latest.json?variable=cloud_cover`

const mockFetch = jest.fn()
const originalFetch = global.fetch

interface Payload {
  valid_times?: unknown
  reference_time?: unknown
}

function ok(payload: Payload): Response {
  return { ok: true, status: 200, statusText: 'OK', json: async () => payload } as unknown as Response
}

const NOT_OK = { ok: false, status: 404, statusText: 'Not Found', json: async () => ({}) } as unknown as Response

/** Route fetch by URL; anything unlisted is a 404. A value of `Error` makes that URL reject. */
function routeFetch(routes: Record<string, Payload | Error>): void {
  mockFetch.mockImplementation(async (url: string) => {
    const route = routes[url]
    if (route instanceof Error) throw route
    return route ? ok(route) : NOT_OK
  })
}

const TIMES = ['2026-09-20T00:00Z', '2026-09-20T01:00Z', '2026-09-20T02:00Z']
const REF = '2026-09-20T00:00:00Z'

describe('useOmeteoMapTileMetadata', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch as unknown as typeof fetch
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('does not fetch when disabled', () => {
    const { result } = renderHookWithQueryClient(() =>
      useOmeteoMapTileMetadata('precipitation', { enabled: false }),
    )
    expect(result.current.fetchStatus).toBe('idle')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns tile and cloud metadata for a precipitation layer', async () => {
    routeFetch({
      [ECMWF_PRECIP]: { valid_times: TIMES, reference_time: REF },
      [ECMWF_CLOUD]: { valid_times: TIMES.slice(0, 2), reference_time: REF },
    })
    const { result } = renderHookWithQueryClient(() => useOmeteoMapTileMetadata('precipitation'))

    await waitFor(() => result.current.isSuccess)

    expect(result.current.data).toEqual({
      tileSourceUrl: ECMWF_PRECIP,
      tileValidTimesLength: 3,
      validTimes: TIMES,
      referenceTime: REF,
      cloudSourceUrl: ECMWF_CLOUD,
      cloudValidTimesLength: 2,
      cloudValidTimes: TIMES.slice(0, 2),
      cloudReferenceTime: REF,
    })
  })

  it('falls back to the next tile candidate when the first has no data, pairing cloud with the same model', async () => {
    routeFetch({
      [ECMWF_PRECIP]: { valid_times: [] },
      [DWD_PRECIP]: { valid_times: TIMES, reference_time: REF },
      [DWD_CLOUD]: { valid_times: TIMES, reference_time: REF },
    })
    const { result } = renderHookWithQueryClient(() => useOmeteoMapTileMetadata('precipitation'))

    await waitFor(() => result.current.isSuccess)

    expect(result.current.data?.tileSourceUrl).toBe(DWD_PRECIP)
    expect(result.current.data?.cloudSourceUrl).toBe(DWD_CLOUD)
  })

  it('falls back when a candidate request rejects or is not ok', async () => {
    routeFetch({
      [ECMWF_PRECIP]: new Error('network down'),
      [DWD_PRECIP]: { valid_times: TIMES, reference_time: REF },
      [ECMWF_CLOUD]: { valid_times: TIMES, reference_time: REF },
    })
    const { result } = renderHookWithQueryClient(() => useOmeteoMapTileMetadata('precipitation'))

    await waitFor(() => result.current.isSuccess)

    expect(result.current.data?.tileSourceUrl).toBe(DWD_PRECIP)
    // paired dwd cloud is a 404, so the first fallback (ecmwf) is used
    expect(result.current.data?.cloudSourceUrl).toBe(ECMWF_CLOUD)
  })

  it('resolves to null when no tile source has usable data', async () => {
    routeFetch({ [ECMWF_PRECIP]: { valid_times: 'nope' }, [DWD_PRECIP]: {} })
    const { result } = renderHookWithQueryClient(() => useOmeteoMapTileMetadata('precipitation'))

    await waitFor(() => result.current.isSuccess)

    expect(result.current.data).toBeNull()
  })

  it('resolves to null when tile data exists but no cloud source does', async () => {
    routeFetch({ [ECMWF_PRECIP]: { valid_times: TIMES, reference_time: REF } })
    const { result } = renderHookWithQueryClient(() => useOmeteoMapTileMetadata('precipitation'))

    await waitFor(() => result.current.isSuccess)

    expect(result.current.data).toBeNull()
  })

  it('adds the derived wind-vector source only for the wind layer', async () => {
    routeFetch({
      [ECMWF_WIND]: { valid_times: TIMES, reference_time: REF },
      [ECMWF_WIND_VECTOR]: { valid_times: TIMES.slice(0, 2), reference_time: REF },
      [ECMWF_CLOUD]: { valid_times: TIMES, reference_time: REF },
    })
    const { result } = renderHookWithQueryClient(() => useOmeteoMapTileMetadata('wind'))

    await waitFor(() => result.current.isSuccess)

    expect(result.current.data).toMatchObject({
      tileSourceUrl: ECMWF_WIND,
      windVectorSourceUrl: ECMWF_WIND_VECTOR,
      windVectorValidTimesLength: 2,
    })
  })

  it('does not include wind-vector fields for non-wind layers', async () => {
    routeFetch({
      [`${BASE}/ecmwf_ifs/latest.json?variable=temperature_2m`]: { valid_times: TIMES, reference_time: REF },
      [ECMWF_CLOUD]: { valid_times: TIMES, reference_time: REF },
    })
    const { result } = renderHookWithQueryClient(() => useOmeteoMapTileMetadata('temperature'))

    await waitFor(() => result.current.isSuccess)

    expect(result.current.data).not.toHaveProperty('windVectorSourceUrl')
  })

  it('normalizes unix-second, unix-millisecond and numeric-string times to ISO strings', async () => {
    const seconds = 1_789_900_000
    routeFetch({
      [ECMWF_PRECIP]: {
        valid_times: [seconds, seconds * 1000, String(seconds), '2026-09-20T05:00Z', null],
        reference_time: seconds,
      },
      [ECMWF_CLOUD]: { valid_times: TIMES, reference_time: REF },
    })
    const { result } = renderHookWithQueryClient(() => useOmeteoMapTileMetadata('precipitation'))

    await waitFor(() => result.current.isSuccess)

    const iso = new Date(seconds * 1000).toISOString()
    expect(result.current.data?.validTimes).toEqual([iso, iso, iso, '2026-09-20T05:00Z', ''])
    expect(result.current.data?.referenceTime).toBe(iso)
  })
})
