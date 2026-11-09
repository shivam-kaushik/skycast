import { fetchMapGrid } from '@/src/api/mapGrid'

describe('fetchMapGrid', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('combines forecast and AQI values for each grid point', async () => {
    const forecast = Array.from({ length: 25 }, (_, index) => ({
      latitude: 43 + index / 100,
      longitude: -79 - index / 100,
      current: {
        temperature_2m: 10 + index,
        precipitation_probability: index,
        cloud_cover: 50 + index,
        windspeed_10m: 12 + index,
        winddirection_10m: 90,
        windgusts_10m: 20 + index,
      },
    }))
    const air = Array.from({ length: 25 }, (_, index) => ({ current: { us_aqi: 20 + index } }))
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => forecast } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => air } as Response)

    const grid = await fetchMapGrid(43.7, -79.4)

    expect(grid).toHaveLength(25)
    expect(grid[0]).toMatchObject({
      temperature: 10,
      precipitationProbability: 0,
      cloudCover: 50,
      windSpeed: 12,
      windGusts: 20,
      usAqi: 20,
    })
    expect(grid[24]?.usAqi).toBe(44)
  })
})
