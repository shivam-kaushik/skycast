import { useMapGrid } from '@/src/hooks/useMapGrid'
import { fetchMapGrid, type MapGridPoint } from '@/src/api/mapGrid'
import { renderHookWithQueryClient, waitFor } from '@/src/utils/testHookHarness'

jest.mock('@/src/api/mapGrid', () => ({
  fetchMapGrid: jest.fn(),
}))

const mockFetchMapGrid = fetchMapGrid as jest.MockedFunction<typeof fetchMapGrid>

const GRID_FIXTURE: MapGridPoint[] = [
  {
    latitude: 43.65, longitude: -79.38, temperature: 19, precipitationProbability: 10,
    cloudCover: 40, windSpeed: 12, windDirection: 180, windGusts: 20, usAqi: 35,
  },
]

describe('useMapGrid', () => {
  beforeEach(() => {
    mockFetchMapGrid.mockReset()
  })

  it('does not fetch when lat/lon are null', () => {
    const { result } = renderHookWithQueryClient(() => useMapGrid(null, null))
    expect(result.current.fetchStatus).toBe('idle')
    expect(mockFetchMapGrid).not.toHaveBeenCalled()
  })

  it('fetches the grid for the given coordinates', async () => {
    mockFetchMapGrid.mockResolvedValue(GRID_FIXTURE)
    const { result } = renderHookWithQueryClient(() => useMapGrid(43.65, -79.38))

    await waitFor(() => result.current.isSuccess)

    expect(mockFetchMapGrid).toHaveBeenCalledWith(43.65, -79.38)
    expect(result.current.data).toEqual(GRID_FIXTURE)
  })

  it('surfaces a fetch failure as an error state', async () => {
    mockFetchMapGrid.mockRejectedValue(new Error('grid failed'))
    const { result } = renderHookWithQueryClient(() => useMapGrid(43.65, -79.38))

    await waitFor(() => result.current.isError)

    expect(result.current.error).toBeInstanceOf(Error)
  })
})
