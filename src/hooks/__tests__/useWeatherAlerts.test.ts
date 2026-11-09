import { useWeatherAlerts } from '@/src/hooks/useWeatherAlerts'
import { renderHookWithQueryClient, waitFor } from '@/src/utils/testHookHarness'

const mockFetch = jest.fn()
const originalFetch = global.fetch

const POLYGON = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }

function nwsResponse(features: unknown[]): Response {
  return { ok: true, json: async () => ({ features }) } as unknown as Response
}

describe('useWeatherAlerts', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch as unknown as typeof fetch
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('returns no alerts and does not hit NWS when coordinates are null', () => {
    const { result } = renderHookWithQueryClient(() => useWeatherAlerts(null, null, 0, 0))
    expect(result.current).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('adds a local thunderstorm alert for weather codes >= 95', () => {
    mockFetch.mockResolvedValue(nwsResponse([]))
    const { result } = renderHookWithQueryClient(() => useWeatherAlerts(40, -74, 95, 10))
    expect(result.current).toEqual([
      expect.objectContaining({ id: 'local-thunderstorm', severity: 'severe', source: 'weathercode' }),
    ])
  })

  it('does not add a thunderstorm alert below code 95', () => {
    mockFetch.mockResolvedValue(nwsResponse([]))
    const { result } = renderHookWithQueryClient(() => useWeatherAlerts(40, -74, 94, 10))
    expect(result.current).toEqual([])
  })

  it('adds a heavy-rain alert for codes 65-67 with precipitation probability > 85', () => {
    mockFetch.mockResolvedValue(nwsResponse([]))
    const { result } = renderHookWithQueryClient(() => useWeatherAlerts(40, -74, 65, 90))
    expect(result.current).toEqual([
      expect.objectContaining({ id: 'local-heavy-rain', severity: 'moderate', source: 'precipitation' }),
    ])
  })

  it('skips the heavy-rain alert when probability is 85 or below', () => {
    mockFetch.mockResolvedValue(nwsResponse([]))
    const { result } = renderHookWithQueryClient(() => useWeatherAlerts(40, -74, 65, 85))
    expect(result.current).toEqual([])
  })

  it('maps NWS features, severity levels and polygon geometry', async () => {
    mockFetch.mockResolvedValue(
      nwsResponse([
        { id: 'a', properties: { event: 'Tornado Warning', headline: 'Take cover', severity: 'Extreme', description: '' }, geometry: POLYGON },
        { id: 'b', properties: { event: 'Flood Watch', headline: 'Rising water', severity: 'Severe', description: '' }, geometry: { type: 'Point', coordinates: [] } },
        { id: 'c', properties: { event: 'Wind Advisory', headline: 'Gusty', severity: 'Minor', description: '' }, geometry: null },
      ]),
    )
    const { result } = renderHookWithQueryClient(() => useWeatherAlerts(40.123456, -74.654321))

    await waitFor(() => result.current.length === 3)

    expect(mockFetch.mock.calls[0]?.[0]).toBe('https://api.weather.gov/alerts/active?point=40.1235,-74.6543')
    expect(result.current).toEqual([
      { id: 'a', title: 'Tornado Warning', description: 'Take cover', severity: 'extreme', source: 'nws', geometry: POLYGON },
      { id: 'b', title: 'Flood Watch', description: 'Rising water', severity: 'severe', source: 'nws', geometry: null },
      { id: 'c', title: 'Wind Advisory', description: 'Gusty', severity: 'moderate', source: 'nws', geometry: null },
    ])
  })

  it('lists local alerts before NWS alerts', async () => {
    mockFetch.mockResolvedValue(
      nwsResponse([{ id: 'n1', properties: { event: 'Heat', headline: 'Hot', severity: 'Severe', description: '' }, geometry: null }]),
    )
    const { result } = renderHookWithQueryClient(() => useWeatherAlerts(40, -74, 96, 0))

    await waitFor(() => result.current.length === 2)

    expect(result.current.map((a) => a.id)).toEqual(['local-thunderstorm', 'n1'])
  })

  it('returns only local alerts when the NWS request is not ok', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({}) } as unknown as Response)
    const { result } = renderHookWithQueryClient(() => useWeatherAlerts(40, -74, 95, 0))

    await waitFor(() => mockFetch.mock.calls.length > 0)

    expect(result.current.map((a) => a.id)).toEqual(['local-thunderstorm'])
  })
})
