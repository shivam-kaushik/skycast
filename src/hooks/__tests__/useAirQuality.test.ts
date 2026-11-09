import { useAirQuality } from '@/src/hooks/useAirQuality'
import { fetchAirQuality } from '@/src/api/airQuality'
import type { AirQualityData } from '@/src/types/weather'
import { renderHookWithQueryClient, waitFor } from '@/src/utils/testHookHarness'

jest.mock('@/src/api/airQuality', () => ({
  fetchAirQuality: jest.fn(),
}))

const mockFetchAirQuality = fetchAirQuality as jest.MockedFunction<typeof fetchAirQuality>

const AIR_FIXTURE: AirQualityData = {
  current: { pm10: 12, pm25: 6, co: 200, no2: 10, ozone: 60, so2: 2, usAqi: 42, europeanAqi: 30 },
  hourly: {
    time: [], pm10: [], pm25: [], no2: [], ozone: [],
    alderPollen: [], birchPollen: [], grassPollen: [],
    mugwortPollen: [], olivePollen: [], ragweedPollen: [],
  },
}

describe('useAirQuality', () => {
  beforeEach(() => {
    mockFetchAirQuality.mockReset()
  })

  it('does not fetch when lat/lon are null', () => {
    const { result } = renderHookWithQueryClient(() => useAirQuality(null, null))
    expect(result.current.fetchStatus).toBe('idle')
    expect(mockFetchAirQuality).not.toHaveBeenCalled()
  })

  it('fetches air quality for the given coordinates and returns the data', async () => {
    mockFetchAirQuality.mockResolvedValue(AIR_FIXTURE)
    const { result } = renderHookWithQueryClient(() => useAirQuality(43.65, -79.38))

    await waitFor(() => result.current.isSuccess)

    expect(mockFetchAirQuality).toHaveBeenCalledWith(43.65, -79.38)
    expect(result.current.data).toEqual(AIR_FIXTURE)
  })

  it('surfaces a fetch failure as an error state', async () => {
    mockFetchAirQuality.mockRejectedValue(new Error('boom'))
    const { result } = renderHookWithQueryClient(() => useAirQuality(43.65, -79.38))

    await waitFor(() => result.current.isError)

    expect(result.current.error).toBeInstanceOf(Error)
  })
})
