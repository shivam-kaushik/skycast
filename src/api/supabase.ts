import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

// SecureStore has a 2048-byte key limit — chunk large values
const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const chunks: string[] = []
    let i = 0
    while (true) {
      const chunk = await SecureStore.getItemAsync(`${key}.${i}`)
      if (chunk === null) break
      chunks.push(chunk)
      i++
    }
    return chunks.length > 0 ? chunks.join('') : null
  },
  setItem: async (key: string, value: string): Promise<void> => {
    const chunkSize = 1800
    const chunks = value.match(new RegExp(`.{1,${chunkSize}}`, 'g')) ?? [value]
    await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}.${i}`, chunk)))
  },
  removeItem: async (key: string): Promise<void> => {
    let i = 0
    while (true) {
      const exists = await SecureStore.getItemAsync(`${key}.${i}`)
      if (exists === null) break
      await SecureStore.deleteItemAsync(`${key}.${i}`)
      i++
    }
  },
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  {
    auth: {
      storage: SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
)
