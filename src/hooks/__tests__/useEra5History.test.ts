import { format, subDays } from 'date-fns'
import { useEra5History } from '@/src/hooks/useEra5History'
import { fetchEra5Daily } from '@/src/api/archiveWeather'
import type { Era5DailyWeather } from '@/src/types/weather'
import { renderHookWithQueryClient, waitFor } from '@/src/utils/testHookHarness'

jest.mock('@/src/api/archiveWeather', () => ({
  fetchEra5Daily: jest.fn(),
}))

const mockFetchEra5Daily = fetchEra5Daily as jest.MockedFunction<typeof fetchEra5Daily>

const ERA5_FIXTURE: Era5DailyWeather = {
  time: ['2026-09-08'],
  tempMax: [20],
  tempMin: [10],
  precipitationSum: [0],
  windSpeedMax: [15],
}

describe('useEra5History', () => {
  beforeEach(() => {
    mockFetchEra5Daily.mockReset()
  })

  it('does not fetch when lat/lon are null', () => {
    const { result } = renderHookWithQueryClient(() => useEra5History(null, null))
    expect(result.current.fetchStatus).toBe('idle')
    expect(mockFetchEra5Daily).not.toHaveBeenCalled()
  })

  it('requests a 7-day window ending 5 days ago (ERA5 lags realtime)', async () => {
    mockFetchEra5Daily.mockResolvedValue(ERA5_FIXTURE)
    const { result } = renderHookWithQueryClient(() => useEra5History(43.65, -79.38))

    await waitFor(() => result.current.isSuccess)

    const end = subDays(new Date(), 5)
    const start = subDays(end, 6)
    expect(mockFetchEra5Daily).toHaveBeenCalledWith(
      43.65,
      -79.38,
      format(start, 'yyyy-MM-dd'),
      format(end, 'yyyy-MM-dd'),
    )
    expect(result.current.data).toEqual(ERA5_FIXTURE)
  })

  it('surfaces a fetch failure as an error state', async () => {
    mockFetchEra5Daily.mockRejectedValue(new Error('archive down'))
    const { result } = renderHookWithQueryClient(() => useEra5History(43.65, -79.38))

    await waitFor(() => result.current.isError)

    expect(result.current.error).toBeInstanceOf(Error)
  })
})
