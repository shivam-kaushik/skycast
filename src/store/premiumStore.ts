import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

const QUERY_COUNT_KEY = 'skycast_ai_query_count'
const QUERY_DATE_KEY = 'skycast_ai_query_date'
const PREMIUM_STATUS_KEY = 'skycast_is_premium'
const DEV_UNLOCK_KEY = 'skycast_dev_unlock'
export const MAX_DAILY_QUERIES = 20

interface PremiumStore {
  isPremium: boolean
  isDevUnlocked: boolean
  queriesUsedToday: number
  queryDate: string
  isPaywallVisible: boolean
  isHydrated: boolean
  setPremium: (value: boolean) => Promise<void>
  showPaywall: () => void
  hidePaywall: () => void
  canQuery: () => boolean
  incrementQuery: () => Promise<void>
  loadQueryCount: () => Promise<void>
  hydrate: () => Promise<void>
  toggleDevUnlock: () => Promise<void>
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export const usePremiumStore = create<PremiumStore>((set, get) => ({
  isPremium: false,
  isDevUnlocked: false,
  queriesUsedToday: 0,
  queryDate: todayStr(),
  isPaywallVisible: false,
  isHydrated: false,

  setPremium: async (value) => {
    set({ isPremium: value })
    await AsyncStorage.setItem(PREMIUM_STATUS_KEY, value ? '1' : '0')
  },

  showPaywall: () => set({ isPaywallVisible: true }),
  hidePaywall: () => set({ isPaywallVisible: false }),

  canQuery: () => {
    const { isPremium, isDevUnlocked, queriesUsedToday, queryDate } = get()
    if (!isPremium && !isDevUnlocked) return false
    if (queryDate !== todayStr()) return true
    return queriesUsedToday < MAX_DAILY_QUERIES
  },

  incrementQuery: async () => {
    const today = todayStr()
    const { queryDate, queriesUsedToday } = get()
    const newCount = queryDate === today ? queriesUsedToday + 1 : 1
    set({ queriesUsedToday: newCount, queryDate: today })
    await AsyncStorage.setItem(QUERY_COUNT_KEY, String(newCount))
    await AsyncStorage.setItem(QUERY_DATE_KEY, today)
  },

  loadQueryCount: async () => {
    const [storedCount, storedDate] = await Promise.all([
      AsyncStorage.getItem(QUERY_COUNT_KEY),
      AsyncStorage.getItem(QUERY_DATE_KEY),
    ])
    const today = todayStr()
    if (storedDate === today && storedCount !== null) {
      set({ queriesUsedToday: parseInt(storedCount, 10), queryDate: today })
    } else {
      set({ queriesUsedToday: 0, queryDate: today })
    }
  },

  // Call once on app start — restores persisted premium + dev unlock before RevenueCat responds
  hydrate: async () => {
    const [premiumStored, devUnlockStored, storedCount, storedDate] = await Promise.all([
      AsyncStorage.getItem(PREMIUM_STATUS_KEY),
      AsyncStorage.getItem(DEV_UNLOCK_KEY),
      AsyncStorage.getItem(QUERY_COUNT_KEY),
      AsyncStorage.getItem(QUERY_DATE_KEY),
    ])
    const today = todayStr()
    const queriesUsedToday =
      storedDate === today && storedCount !== null ? parseInt(storedCount, 10) : 0

    set({
      isPremium: premiumStored === '1',
      isDevUnlocked: devUnlockStored === '1',
      queriesUsedToday,
      queryDate: today,
      isHydrated: true,
    })
  },

  // Toggle developer test mode — activated via secret tap gesture in More screen
  toggleDevUnlock: async () => {
    const next = !get().isDevUnlocked
    set({ isDevUnlocked: next })
    await AsyncStorage.setItem(DEV_UNLOCK_KEY, next ? '1' : '0')
  },
}))
