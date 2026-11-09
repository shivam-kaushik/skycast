import { fetchEra5Daily } from '@/src/api/archiveWeather'

const mockFetch = jest.fn()
const originalFetch = global.fetch

const RAW_DAILY = {
  time: ['2026-09-08', '2026-09-09'],
  temperature_2m_max: [21, 23],
  temperature_2m_min: [11, 12],
  precipitation_sum: [0, 4.2],
  windspeed_10m_max: [15, 22],
}

describe('fetchEra5Daily', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch as unknown as typeof fetch
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('requests the ERA5 archive endpoint with the expected query', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ daily: RAW_DAILY }) })

    await fetchEra5Daily(43.65, -79.38, '2026-09-08', '2026-09-14')

    const url = new URL(mockFetch.mock.calls[0]?.[0] as string)
    expect(url.origin + url.pathname).toBe('https://archive-api.open-meteo.com/v1/era5')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      latitude: '43.65',
      longitude: '-79.38',
      start_date: '2026-09-08',
      end_date: '2026-09-14',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max',
      timezone: 'auto',
    })
  })

  it('maps the raw daily series to the app shape', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ daily: RAW_DAILY }) })

    await expect(fetchEra5Daily(1, 2, '2026-09-08', '2026-09-09')).resolves.toEqual({
      time: ['2026-09-08', '2026-09-09'],
      tempMax: [21, 23],
      tempMin: [11, 12],
      precipitationSum: [0, 4.2],
      windSpeedMax: [15, 22],
    })
  })

  it('throws with the status when the API responds with an error', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' })

    await expect(fetchEra5Daily(1, 2, 'a', 'b')).rejects.toThrow('ERA5 API error: 500 Server Error')
  })

  it('propagates network failures', async () => {
    mockFetch.mockRejectedValue(new Error('offline'))

    await expect(fetchEra5Daily(1, 2, 'a', 'b')).rejects.toThrow('offline')
  })
})
