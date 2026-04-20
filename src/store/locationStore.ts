import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'

export interface SavedLocation {
  id: string
  cityName: string
  lat: number
  lon: number
  country?: string
  admin1?: string
  isFavorite: boolean
  lastSelectedAt: number
}

const memoryStore = new Map<string, string>()

const inMemoryStorage: StateStorage = {
  getItem: (name) => memoryStore.get(name) ?? null,
  setItem: (name, value) => {
    memoryStore.set(name, value)
  },
  removeItem: (name) => {
    memoryStore.delete(name)
  },
}

interface LocationStore {
  lat: number | null
  lon: number | null
  cityName: string
  /** Last known GPS fix (updated whenever we successfully read device location). */
  deviceLat: number | null
  deviceLon: number | null
  deviceCityName: string
  isManualSelection: boolean
  /** Device GPS / permission flow — driven by `useLocation()` in tab layout (single instance). */
  locationLoading: boolean
  locationError: string | null
  locationPermissionDenied: boolean
  savedLocations: SavedLocation[]
  recentLocationIds: string[]
  setLocation: (lat: number, lon: number, cityName: string) => void
  recordDeviceLocation: (lat: number, lon: number, cityName: string) => void
  selectManualLocation: (location: Omit<SavedLocation, 'isFavorite' | 'lastSelectedAt'>) => void
  useDeviceLocation: () => void
  toggleFavorite: (id: string) => void
  setLocationUi: (patch: {
    locationLoading?: boolean
    locationError?: string | null
    locationPermissionDenied?: boolean
  }) => void
}

function upsertLocation(
  list: SavedLocation[],
  item: Omit<SavedLocation, 'isFavorite' | 'lastSelectedAt'>,
): SavedLocation[] {
  const now = Date.now()
  const existing = list.find((entry) => entry.id === item.id)
  if (existing) {
    return list.map((entry) =>
      entry.id === item.id
        ? {
            ...entry,
            cityName: item.cityName,
            lat: item.lat,
            lon: item.lon,
            country: item.country,
            admin1: item.admin1,
            lastSelectedAt: now,
          }
        : entry,
    )
  }
  return [
    {
      ...item,
      isFavorite: false,
      lastSelectedAt: now,
    },
    ...list,
  ]
}

export const useLocationStore = create<LocationStore>()(
  persist(
    (set) => ({
      lat: null,
      lon: null,
      cityName: '',
      deviceLat: null,
      deviceLon: null,
      deviceCityName: '',
      isManualSelection: false,
      locationLoading: true,
      locationError: null,
      locationPermissionDenied: false,
      savedLocations: [],
      recentLocationIds: [],
      setLocationUi: (patch) =>
        set((state) => ({
          locationLoading: patch.locationLoading ?? state.locationLoading,
          locationError: patch.locationError !== undefined ? patch.locationError : state.locationError,
          locationPermissionDenied:
            patch.locationPermissionDenied ?? state.locationPermissionDenied,
        })),
      setLocation: (lat, lon, cityName) =>
        set((state) => {
          if (state.isManualSelection) {
            return state
          }
          return { lat, lon, cityName }
        }),
      recordDeviceLocation: (lat, lon, cityName) =>
        set({
          deviceLat: lat,
          deviceLon: lon,
          deviceCityName: cityName,
        }),
      selectManualLocation: (location) =>
        set((state) => {
          const nextSaved = upsertLocation(state.savedLocations, location)
          const nextRecent = [location.id, ...state.recentLocationIds.filter((id) => id !== location.id)].slice(
            0,
            10,
          )
          return {
            lat: location.lat,
            lon: location.lon,
            cityName: location.cityName,
            isManualSelection: true,
            savedLocations: nextSaved,
            recentLocationIds: nextRecent,
          }
        }),
      useDeviceLocation: () =>
        set((state) => {
          if (state.deviceLat !== null && state.deviceLon !== null) {
            return {
              isManualSelection: false,
              lat: state.deviceLat,
              lon: state.deviceLon,
              cityName: state.deviceCityName || 'Your Location',
            }
          }
          return { isManualSelection: false }
        }),
      toggleFavorite: (id) =>
        set((state) => ({
          savedLocations: state.savedLocations.map((entry) =>
            entry.id === id ? { ...entry, isFavorite: !entry.isFavorite } : entry,
          ),
        })),
    }),
    {
      name: 'skycast-location-store',
      storage: createJSONStorage(() => inMemoryStorage),
      // `partialize` omits `locationLoading`; default merge would keep the initial `true`
      // while restoring `lat`/`lon`, leaving the UI stuck on "Getting your location…".
      merge: (persistedState, currentState) => {
        const patch =
          persistedState !== null && typeof persistedState === 'object'
            ? (persistedState as Partial<LocationStore>)
            : {}
        const merged: LocationStore = { ...currentState, ...patch }
        if (merged.lat !== null && merged.lon !== null) {
          return {
            ...merged,
            locationLoading: false,
            locationPermissionDenied: false,
            locationError: null,
          }
        }
        return merged
      },
      partialize: (state) => ({
        lat: state.lat,
        lon: state.lon,
        cityName: state.cityName,
        deviceLat: state.deviceLat,
        deviceLon: state.deviceLon,
        deviceCityName: state.deviceCityName,
        isManualSelection: state.isManualSelection,
        savedLocations: state.savedLocations,
        recentLocationIds: state.recentLocationIds,
        // locationLoading / locationError / locationPermissionDenied are session-only
      }),
    },
  ),
)
