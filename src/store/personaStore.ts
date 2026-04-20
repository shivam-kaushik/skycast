import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface PersonaStore {
  persona: 'athlete' | 'wellness'
  setPersona: (p: 'athlete' | 'wellness') => void
}

export const usePersonaStore = create<PersonaStore>()(
  persist(
    (set) => ({
      persona: 'athlete',
      setPersona: (persona) => set({ persona }),
    }),
    {
      name: 'skycast-persona',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
