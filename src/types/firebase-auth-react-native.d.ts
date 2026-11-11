import type { Persistence, ReactNativeAsyncStorage } from 'firebase/auth'

/**
 * `getReactNativePersistence` ships in Firebase's React Native build of `firebase/auth`, but the
 * package's `types` export condition always resolves to the browser typings, which omit it.
 * Metro picks the React Native build at runtime, so declare the function here.
 */
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence
}
