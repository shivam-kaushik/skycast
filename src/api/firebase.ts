import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import type { Auth } from 'firebase/auth'
import { createAuth } from '@/src/api/firebaseAuthInit'

/**
 * Firebase web-app config (Firebase console → Project settings → Your apps → Web app).
 * These values are public identifiers, not secrets — access is controlled by Firebase Auth rules.
 */
export const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
}

let cachedAuth: Auth | null = null

/**
 * Lazily start Firebase Auth. Lazy because Firebase throws (`auth/invalid-api-key`) when the config is
 * missing — doing that at import time would crash the whole app instead of just failing sign-in.
 */
export function getFirebaseAuth(): Auth {
  if (cachedAuth) return cachedAuth
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  cachedAuth = createAuth(app)
  return cachedAuth
}
