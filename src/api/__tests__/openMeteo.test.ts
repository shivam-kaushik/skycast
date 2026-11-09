import { fetchWeather } from '@/src/api/openMeteo'

describe('fetchWeather', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('maps the radar fields from the Open-Meteo response', async () => {
    const response = {
      current: {
        temperature_2m: 15.8,
        apparent_temperature: 14.9,
        relative_humidity_2m: 62,
        precipitation_probability: 0,
        weathercode: 1,
        windspeed_10m: 14.8,
        winddirection_10m: 86,
        windgusts_10m: 21.6,
        surface_pressure: 1018,
        visibility: 24000,
        uv_index: 3,
        cloud_cover: 20,
      },
      hourly: {
        time: ['2026-09-19T17:00'],
        temperature_2m: [15.8],
        apparent_temperature: [14.9],
        precipitation_probability: [0],
        precipitation: [0],
        weathercode: [1],
        windspeed_10m: [14.8],
        windgusts_10m: [21.6],
        uv_index: [3],
        cloud_cover: [20],
        visibility: [24000],
        relativehumidity_2m: [62],
        surface_pressure: [1018],
      },
      daily: {
        time: ['2026-09-19'],
        temperature_2m_max: [18],
        temperature_2m_min: [10],
        weathercode: [1],
        precipitation_sum: [0],
        precipitation_probability_max: [10],
        windspeed_10m_max: [22],
        windgusts_10m_max: [30],
        uv_index_max: [4],
        sunrise: ['2026-09-19T06:50'],
        sunset: ['2026-09-19T19:20'],
      },
    }
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => response,
    } as Response)

    const weather = await fetchWeather(43.7103, -79.3939)

    expect(weather.current).toMatchObject({
      temperature: 15.8,
      precipitationProbability: 0,
      windSpeed: 14.8,
      windDirection: 86,
      windGusts: 21.6,
    })
    expect(weather.current.visibility).toBe(24)
  })
})