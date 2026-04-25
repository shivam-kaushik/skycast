import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

const QUERY_COUNT_KEY = 'skycast_ai_query_count'
const QUERY_DATE_KEY = 'skycast_ai_query_date'
const MAX_DAILY_QUERIES = 20

interface PremiumStore {
  isPremium: boolean
  queriesUsedToday: number
  queryDate: string
  isPaywallVisible: boolean
  setPremium: (value: boolean) => void
  showPaywall: () => void
  hidePaywall: () => void
  canQuery: () => boolean
  incrementQuery: () => Promise<void>
  loadQueryCount: () => Promise<void>
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export const usePremiumStore = create<PremiumStore>((set, get) => ({
  isPremium: false,
  queriesUsedToday: 0,
  queryDate: todayStr(),
  isPaywallVisible: false,

  setPremium: (value) => set({ isPremium: value }),
  showPaywall: () => set({ isPaywallVisible: true }),
  hidePaywall: () => set({ isPaywallVisible: false }),

  canQuery: () => {
    const { isPremium, queriesUsedToday, queryDate } = get()
    if (!isPremium) return false
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
}))

export { MAX_DAILY_QUERIES }
