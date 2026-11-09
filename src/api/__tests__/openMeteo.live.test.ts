import { fetchAirQuality } from '@/src/api/airQuality'
import { fetchMapGrid } from '@/src/api/mapGrid'
import { fetchWeather } from '@/src/api/openMeteo'

const runLive = process.env.RUN_LIVE_API_TESTS === '1'

;(runLive ? describe : describe.skip)('Open-Meteo live API contracts', () => {
  jest.setTimeout(30000)

  it('returns the current fields rendered by the radar map', async () => {
    const [weather, airQuality, mapGrid] = await Promise.all([
      fetchWeather(43.7103, -79.3939),
      fetchAirQuality(43.7103, -79.3939),
      fetchMapGrid(43.7103, -79.3939),
    ])

    expect(Number.isFinite(weather.current.temperature)).toBe(true)
    expect(Number.isFinite(weather.current.precipitationProbability)).toBe(true)
    expect(Number.isFinite(weather.current.windSpeed)).toBe(true)
    expect(Number.isFinite(weather.current.windGusts)).toBe(true)
    expect(Number.isFinite(airQuality.current.usAqi)).toBe(true)
    expect(mapGrid).toHaveLength(25)
    expect(Number.isFinite(mapGrid[0]?.cloudCover)).toBe(true)
    expect(Number.isFinite(mapGrid[0]?.windDirection)).toBe(true)
  })
})