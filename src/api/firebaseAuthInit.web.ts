import type { FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

/** Web: Firebase's default browser persistence (IndexedDB) already keeps the user signed in. */
export function createAuth(app: FirebaseApp): Auth {
  return getAuth(app)
}
