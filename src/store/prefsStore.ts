import { create } from 'zustand'

export interface AlertsEnabled {
  rain: boolean
  uv: boolean
  wind: boolean
  pollen: boolean
  severe: boolean
}

interface PrefsStore {
  unit: 'C' | 'F'
  rainThreshold: number // default 60 (%)
  windThreshold: number // default 50 (km/h)
  uvThreshold: number // default 7
  alertsEnabled: AlertsEnabled
  setUnit: (unit: 'C' | 'F') => void
  setThreshold: (key: string, value: number) => void
  toggleAlert: (key: string) => void
}

export const usePrefsStore = create<PrefsStore>((set) => ({
  unit: 'C',
  rainThreshold: 60,
  windThreshold: 50,
  uvThreshold: 7,
  alertsEnabled: {
    rain: true,
    uv: true,
    wind: true,
    pollen: true,
    severe: true,
  },
  setUnit: (unit) => set({ unit }),
  setThreshold: (key, value) =>
    set((state) => ({ ...state, [key]: value })),
  toggleAlert: (key) =>
    set((state) => {
      const k = key as keyof AlertsEnabled
      const prev = state.alertsEnabled[k]
      const current = typeof prev === 'boolean' ? prev : false
      return {
        alertsEnabled: {
          ...state.alertsEnabled,
          [k]: !current,
        },
      }
    }),
}))
