import { useLocationStore } from '@/src/store/locationStore'

describe('locationStore', () => {
  it('keeps manual selection when device location updates', () => {
    useLocationStore.setState({
      lat: null,
      lon: null,
      cityName: '',
      deviceLat: null,
      deviceLon: null,
      deviceCityName: '',
      isManualSelection: false,
      savedLocations: [],
      recentLocationIds: [],
    })

    useLocationStore.getState().selectManualLocation({
      id: 'toronto',
      cityName: 'Toronto',
      lat: 43.6532,
      lon: -79.3832,
      country: 'Canada',
      admin1: 'Ontario',
    })
    useLocationStore.getState().setLocation(40.7128, -74.006, 'New York')

    const state = useLocationStore.getState()
    expect(state.cityName).toBe('Toronto')
    expect(state.lat).toBeCloseTo(43.6532)
    expect(state.lon).toBeCloseTo(-79.3832)
  })

  it('tracks recents and favorites', () => {
    useLocationStore.setState({
      lat: null,
      lon: null,
      cityName: '',
      deviceLat: null,
      deviceLon: null,
      deviceCityName: '',
      isManualSelection: false,
      savedLocations: [],
      recentLocationIds: [],
    })

    useLocationStore.getState().selectManualLocation({
      id: 'london',
      cityName: 'London',
      lat: 51.5072,
      lon: -0.1276,
      country: 'UK',
      admin1: 'England',
    })
    useLocationStore.getState().toggleFavorite('london')

    const state = useLocationStore.getState()
    expect(state.recentLocationIds[0]).toBe('london')
    expect(state.savedLocations.find((item) => item.id === 'london')?.isFavorite).toBe(true)
  })

  it('useDeviceLocation restores last GPS snapshot and clears manual mode', () => {
    useLocationStore.setState({
      lat: 51.5,
      lon: -0.12,
      cityName: 'London',
      deviceLat: 43.65,
      deviceLon: -79.38,
      deviceCityName: 'Toronto',
      isManualSelection: true,
      savedLocations: [],
      recentLocationIds: [],
    })

    useLocationStore.getState().useDeviceLocation()
    const state = useLocationStore.getState()
    expect(state.isManualSelection).toBe(false)
    expect(state.cityName).toBe('Toronto')
    expect(state.lat).toBeCloseTo(43.65)
    expect(state.lon).toBeCloseTo(-79.38)
  })
})
