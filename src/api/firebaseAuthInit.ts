import type { FirebaseApp } from 'firebase/app'
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'

/** iOS/Android: keep the user signed in across launches by persisting auth state to AsyncStorage. */
export function createAuth(app: FirebaseApp): Auth {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  } catch (error: unknown) {
    // Fast refresh re-runs this module while the app already has an Auth instance.
    if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/already-initialized') {
      return getAuth(app)
    }
    throw error
  }
}
