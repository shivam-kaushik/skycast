import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
  type UserCredential,
} from 'firebase/auth'
import * as Crypto from 'expo-crypto'
import { getFirebaseAuth } from '@/src/api/firebase'

/**
 * Everything the app needs from Firebase Auth, behind a small typed surface.
 * Screens never import `firebase/auth` directly, and nothing here throws at a screen —
 * failures come back as `{ ok: false, error }` with a message that's ready to show.
 */

export interface AuthUser {
  id: string
  email: string | null
  displayName: string | null
  emailVerified: boolean
}

export type AuthResult = { ok: true; user: AuthUser } | { ok: false; error: string }
export type AuthActionResult = { ok: true } | { ok: false; error: string }

const GENERIC_ERROR = 'Something went wrong. Please try again.'
const BAD_CREDENTIALS = 'Incorrect email or password.'
const NOT_CONFIGURED = "Sign-in isn't set up yet. Please try again later."

const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': BAD_CREDENTIALS,
  'auth/invalid-login-credentials': BAD_CREDENTIALS,
  'auth/wrong-password': BAD_CREDENTIALS,
  'auth/user-not-found': BAD_CREDENTIALS,
  'auth/invalid-email': 'That email address looks invalid.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
  'auth/weak-password': 'Please choose a stronger password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': "Can't reach the server. Check your connection and try again.",
  'auth/user-disabled': 'This account has been disabled.',
  'auth/operation-not-allowed': "This sign-in method isn't enabled yet.",
  'auth/account-exists-with-different-credential': 'This email is already linked to a different sign-in method.',
  'auth/invalid-api-key': NOT_CONFIGURED,
}

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.uid,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
  }
}

export function friendlyAuthError(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error) || typeof error.code !== 'string') {
    return GENERIC_ERROR
  }
  if (error.code.startsWith('auth/api-key-not-valid')) return NOT_CONFIGURED
  return ERROR_MESSAGES[error.code] ?? GENERIC_ERROR
}

async function signInWith(attempt: () => Promise<UserCredential>): Promise<AuthResult> {
  try {
    const { user } = await attempt()
    return { ok: true, user: toAuthUser(user) }
  } catch (error: unknown) {
    return { ok: false, error: friendlyAuthError(error) }
  }
}

export function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  return signInWith(() => signInWithEmailAndPassword(getFirebaseAuth(), email, password))
}

/** Creates the account (which also signs the user in) and sends a verification email, best effort. */
export function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  return signInWith(async () => {
    const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password)
    try {
      await sendEmailVerification(credential.user)
    } catch {
      // The account exists either way; a missing verification email must not fail signup.
    }
    return credential
  })
}

export function signInWithGoogle(idToken: string): Promise<AuthResult> {
  return signInWith(() => signInWithCredential(getFirebaseAuth(), GoogleAuthProvider.credential(idToken)))
}

/**
 * Apple sign-in needs a nonce: Apple gets the SHA-256 `hashed` value, Firebase gets the `raw` one,
 * and Firebase checks they match so a stolen identity token can't be replayed.
 */
export async function createAppleNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = Crypto.randomUUID()
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw)
  return { raw, hashed }
}

export function signInWithApple(identityToken: string, rawNonce: string): Promise<AuthResult> {
  return signInWith(() => {
    const credential = new OAuthProvider('apple.com').credential({ idToken: identityToken, rawNonce })
    return signInWithCredential(getFirebaseAuth(), credential)
  })
}

/** Best effort — a missing display name must never block signing in. */
export async function saveDisplayName(displayName: string): Promise<void> {
  try {
    const user = getFirebaseAuth().currentUser
    if (!user) return
    await updateProfile(user, { displayName })
  } catch {
    // ignore — see above
  }
}

/** Firebase emails a link to its hosted reset page; the user then signs in here with the new password. */
export async function sendPasswordReset(email: string): Promise<AuthActionResult> {
  try {
    await sendPasswordResetEmail(getFirebaseAuth(), email)
    return { ok: true }
  } catch (error: unknown) {
    return { ok: false, error: friendlyAuthError(error) }
  }
}

export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(getFirebaseAuth())
  } catch {
    // Local state is cleared by the caller regardless.
  }
}

/** Resolves once Firebase has restored any persisted sign-in. Rejects if Firebase can't start. */
export async function waitForInitialUser(): Promise<AuthUser | null> {
  const auth = getFirebaseAuth()
  await auth.authStateReady()
  return auth.currentUser ? toAuthUser(auth.currentUser) : null
}

/** Calls `onChange` on every sign-in/sign-out. Returns the unsubscribe function. */
export function subscribeToAuthChanges(onChange: (user: AuthUser | null) => void): () => void {
  try {
    return onAuthStateChanged(getFirebaseAuth(), (user) => onChange(user ? toAuthUser(user) : null))
  } catch {
    return () => {}
  }
}
