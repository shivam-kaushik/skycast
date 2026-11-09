import { fetchAirQuality } from '@/src/api/airQuality'
import { logger } from '@/src/utils/logger'

jest.mock('@/src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

const RESPONSE = {
  current: {
    pm10: 3.3,
    pm2_5: 3,
    carbon_monoxide: 120,
    nitrogen_dioxide: 8,
    ozone: 80,
    sulphur_dioxide: 1,
    us_aqi: 29,
    european_aqi: 12,
  },
  hourly: {
    time: ['2026-09-19T17:00', '2026-09-19T18:00'],
    pm10: [3.3, 4],
    pm2_5: [3, 3.5],
    nitrogen_dioxide: [8, 9],
    ozone: [80, 78],
    alder_pollen: [null, 1],
    birch_pollen: [null, 2],
    grass_pollen: [0, 3],
    mugwort_pollen: [null, null],
    olive_pollen: [null, 4],
    ragweed_pollen: [5, 6],
  },
}

function mockOk(body: unknown = RESPONSE): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => body } as Response)
}

describe('fetchAirQuality', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    ;(logger.error as jest.Mock).mockClear()
    ;(logger.info as jest.Mock).mockClear()
  })

  it('maps the AQI value used by the radar air layer', async () => {
    mockOk()

    const air = await fetchAirQuality(43.7103, -79.3939)

    expect(air.current).toMatchObject({ usAqi: 29, pm25: 3, pm10: 3.3 })
  })

  it('requests the air-quality endpoint with the expected variables', async () => {
    const fetchSpy = mockOk()

    await fetchAirQuality(43.7103, -79.3939)

    const url = new URL(fetchSpy.mock.calls[0]?.[0] as string)
    expect(url.origin + url.pathname).toBe('https://air-quality-api.open-meteo.com/v1/air-quality')
    expect(url.searchParams.get('latitude')).toBe('43.7103')
    expect(url.searchParams.get('longitude')).toBe('-79.3939')
    expect(url.searchParams.get('timezone')).toBe('auto')
    expect(url.searchParams.get('current')?.split(',')).toEqual([
      'pm10', 'pm2_5', 'carbon_monoxide', 'nitrogen_dioxide', 'ozone', 'sulphur_dioxide', 'us_aqi', 'european_aqi',
    ])
    expect(url.searchParams.get('hourly')?.split(',')).toEqual([
      'pm10', 'pm2_5', 'nitrogen_dioxide', 'ozone',
      'alder_pollen', 'birch_pollen', 'grass_pollen', 'mugwort_pollen', 'olive_pollen', 'ragweed_pollen',
    ])
  })

  it('maps every current reading to the app field names', async () => {
    mockOk()

    const { current } = await fetchAirQuality(1, 2)

    expect(current).toEqual({
      pm10: 3.3, pm25: 3, co: 120, no2: 8, ozone: 80, so2: 1, usAqi: 29, europeanAqi: 12,
    })
  })

  it('maps every hourly series, keeping null pollen where the model has no coverage', async () => {
    mockOk()

    const { hourly } = await fetchAirQuality(1, 2)

    expect(hourly).toEqual({
      time: ['2026-09-19T17:00', '2026-09-19T18:00'],
      pm10: [3.3, 4],
      pm25: [3, 3.5],
      no2: [8, 9],
      ozone: [80, 78],
      alderPollen: [null, 1],
      birchPollen: [null, 2],
      grassPollen: [0, 3],
      mugwortPollen: [null, null],
      olivePollen: [null, 4],
      ragweedPollen: [5, 6],
    })
  })

  it('logs how many hourly points were loaded', async () => {
    mockOk()

    await fetchAirQuality(1, 2)

    expect(logger.info).toHaveBeenCalledWith('air.api', 'air quality payload loaded', expect.objectContaining({ lat: 1, lon: 2, hourlyPoints: 2 }))
  })

  it('throws and logs when the API responds with an error status', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 429, statusText: 'Too Many Requests' } as Response)

    await expect(fetchAirQuality(1, 2)).rejects.toThrow('Air quality API error: 429 Too Many Requests')
    expect(logger.error).toHaveBeenCalledWith('air.api', expect.any(Error), expect.objectContaining({ status: 429 }))
  })

  it('rethrows network failures', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'))

    await expect(fetchAirQuality(1, 2)).rejects.toThrow('offline')
    expect(logger.error).toHaveBeenCalledWith('air.api', expect.any(Error), expect.objectContaining({ lat: 1, lon: 2 }))
  })

  it('wraps non-Error failures in an Error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue('weird')

    await expect(fetchAirQuality(1, 2)).rejects.toThrow('Unknown air quality fetch failure')
  })

  it('rejects a malformed payload instead of returning partial data', async () => {
    mockOk({})

    await expect(fetchAirQuality(1, 2)).rejects.toThrow()
  })
})
