import { create } from 'zustand'

interface LocationStore {
  lat: number | null
  lon: number | null
  cityName: string
  setLocation: (lat: number, lon: number, cityName: string) => void
}

export const useLocationStore = create<LocationStore>((set) => ({
  lat: null,
  lon: null,
  cityName: '',
  setLocation: (lat, lon, cityName) => set({ lat, lon, cityName }),
}))
