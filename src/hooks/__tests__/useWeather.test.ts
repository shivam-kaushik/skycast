import { useWeather } from '@/src/hooks/useWeather'
import { fetchWeather } from '@/src/api/openMeteo'
import { usePremiumStore } from '@/src/store/premiumStore'
import { renderHookWithQueryClient, waitFor } from '@/src/utils/testHookHarness'

jest.mock('@/src/api/openMeteo', () => ({
  fetchWeather: jest.fn(),
}))

const mockFetchWeather = fetchWeather as jest.MockedFunction<typeof fetchWeather>

const WEATHER_FIXTURE = {
  current: {
    temperature: 22, apparentTemperature: 21, humidity: 60,
    precipitationProbability: 20, weatherCode: 1, windSpeed: 15,
    windDirection: 270, windGusts: 25, pressure: 1015,
    visibility: 12, uvIndex: 5, cloudCover: 30,
  },
  hourly: {
    time: [], temperature: [], apparentTemperature: [],
    precipitationProbability: [], precipitation: [], weatherCode: [],
    windSpeed: [], windGusts: [], uvIndex: [], cloudCover: [],
    visibility: [], humidity: [],
  },
  daily: {
    time: [], tempMax: [], tempMin: [], weatherCode: [],
    precipitationSum: [], precipitationProbabilityMax: [],
    windSpeedMax: [], windGustsMax: [], uvIndexMax: [],
    sunrise: [], sunset: [],
  },
}

describe('useWeather', () => {
  beforeEach(() => {
    mockFetchWeather.mockReset()
    usePremiumStore.setState({ isPremium: false })
  })

  it('does not fetch when lat/lon are null', () => {
    const { result } = renderHookWithQueryClient(() => useWeather(null, null))
    expect(result.current.fetchStatus).toBe('idle')
    expect(mockFetchWeather).not.toHaveBeenCalled()
  })

  it('fetches weather for the given coordinates and returns the data on success', async () => {
    mockFetchWeather.mockResolvedValue(WEATHER_FIXTURE)
    const { result } = renderHookWithQueryClient(() => useWeather(51.5, -0.1))

    await waitFor(() => result.current.isSuccess)

    expect(mockFetchWeather).toHaveBeenCalledWith(51.5, -0.1)
    expect(result.current.data).toEqual(WEATHER_FIXTURE)
  })

  it('surfaces a fetch failure as an error state', async () => {
    mockFetchWeather.mockRejectedValue(new Error('network down'))
    const { result } = renderHookWithQueryClient(() => useWeather(51.5, -0.1))

    await waitFor(() => result.current.isError)

    expect(result.current.error).toBeInstanceOf(Error)
  })
})
