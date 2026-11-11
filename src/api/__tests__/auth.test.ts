import {
  createAppleNonce,
  friendlyAuthError,
  saveDisplayName,
  sendPasswordReset,
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
  subscribeToAuthChanges,
  toAuthUser,
  waitForInitialUser,
} from '@/src/api/auth'

const mockAuth: { currentUser: unknown; authStateReady: jest.Mock } = {
  currentUser: null,
  authStateReady: jest.fn(),
}
let mockAuthUnavailable: Error | null = null

jest.mock('@/src/api/firebase', () => ({
  getFirebaseAuth: () => {
    if (mockAuthUnavailable) throw mockAuthUnavailable
    return mockAuth
  },
}))

jest.mock('firebase/auth', () => {
  const credential = jest.fn((token: string) => ({ providerId: 'google.com', token }))
  const appleCredential = jest.fn((options: object) => ({ providerId: 'apple.com', ...options }))
  return {
    createUserWithEmailAndPassword: jest.fn(),
    onAuthStateChanged: jest.fn(),
    sendEmailVerification: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    signInWithCredential: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    updateProfile: jest.fn(),
    GoogleAuthProvider: { credential },
    OAuthProvider: jest.fn().mockImplementation((providerId: string) => ({ providerId, credential: appleCredential })),
    __appleCredential: appleCredential,
  }
})

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  randomUUID: jest.fn(() => 'raw-nonce'),
  digestStringAsync: jest.fn(async (_algorithm: string, value: string) => `sha256(${value})`),
}))

const fb = jest.requireMock('firebase/auth') as Record<
  | 'createUserWithEmailAndPassword'
  | 'onAuthStateChanged'
  | 'sendEmailVerification'
  | 'sendPasswordResetEmail'
  | 'signInWithCredential'
  | 'signInWithEmailAndPassword'
  | 'signOut'
  | 'updateProfile'
  | 'OAuthProvider'
  | '__appleCredential',
  jest.Mock
> & { GoogleAuthProvider: { credential: jest.Mock } }

const FIREBASE_USER = { uid: 'uid-1', email: 'a@b.co', displayName: null, emailVerified: false }
const APP_USER = { id: 'uid-1', email: 'a@b.co', displayName: null, emailVerified: false }

function firebaseError(code: string): Error & { code: string } {
  return Object.assign(new Error(`Firebase: Error (${code}).`), { code })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuthUnavailable = null
  mockAuth.currentUser = null
  mockAuth.authStateReady.mockResolvedValue(undefined)
})

describe('toAuthUser', () => {
  it('keeps only the fields the app uses, under app names', () => {
    expect(toAuthUser({ ...FIREBASE_USER, displayName: 'Ada', emailVerified: true, providerData: [] } as never)).toEqual({
      id: 'uid-1',
      email: 'a@b.co',
      displayName: 'Ada',
      emailVerified: true,
    })
  })
})

describe('friendlyAuthError', () => {
  it.each([
    ['auth/invalid-credential', 'Incorrect email or password.'],
    ['auth/wrong-password', 'Incorrect email or password.'],
    ['auth/user-not-found', 'Incorrect email or password.'],
    ['auth/invalid-email', 'That email address looks invalid.'],
    ['auth/email-already-in-use', 'An account with this email already exists. Try signing in.'],
    ['auth/weak-password', 'Please choose a stronger password.'],
    ['auth/too-many-requests', 'Too many attempts. Please wait a moment and try again.'],
    ['auth/network-request-failed', "Can't reach the server. Check your connection and try again."],
    ['auth/user-disabled', 'This account has been disabled.'],
    ['auth/operation-not-allowed', "This sign-in method isn't enabled yet."],
    ['auth/account-exists-with-different-credential', 'This email is already linked to a different sign-in method.'],
    ['auth/invalid-api-key', "Sign-in isn't set up yet. Please try again later."],
    ['auth/api-key-not-valid.-please-pass-a-valid-api-key.', "Sign-in isn't set up yet. Please try again later."],
  ])('maps %s to a readable message', (code, message) => {
    expect(friendlyAuthError(firebaseError(code))).toBe(message)
  })

  it.each([[firebaseError('auth/something-new')], [new Error('boom')], ['text'], [null]])(
    'falls back to a generic message for %p',
    (error) => {
      expect(friendlyAuthError(error)).toBe('Something went wrong. Please try again.')
    },
  )
})

describe('signInWithEmail', () => {
  it('signs in and returns the app user', async () => {
    fb.signInWithEmailAndPassword.mockResolvedValue({ user: FIREBASE_USER })

    await expect(signInWithEmail('a@b.co', 'pw')).resolves.toEqual({ ok: true, user: APP_USER })
    expect(fb.signInWithEmailAndPassword).toHaveBeenCalledWith(mockAuth, 'a@b.co', 'pw')
  })

  it('returns a readable error instead of throwing', async () => {
    fb.signInWithEmailAndPassword.mockRejectedValue(firebaseError('auth/invalid-credential'))

    await expect(signInWithEmail('a@b.co', 'bad')).resolves.toEqual({ ok: false, error: 'Incorrect email or password.' })
  })

  it('returns an error when Firebase cannot start (missing config)', async () => {
    mockAuthUnavailable = firebaseError('auth/invalid-api-key')

    await expect(signInWithEmail('a@b.co', 'pw')).resolves.toEqual({
      ok: false,
      error: "Sign-in isn't set up yet. Please try again later.",
    })
  })
})

describe('signUpWithEmail', () => {
  it('creates the account, sends a verification email and returns the user', async () => {
    fb.createUserWithEmailAndPassword.mockResolvedValue({ user: FIREBASE_USER })
    fb.sendEmailVerification.mockResolvedValue(undefined)

    await expect(signUpWithEmail('a@b.co', 'password1')).resolves.toEqual({ ok: true, user: APP_USER })
    expect(fb.createUserWithEmailAndPassword).toHaveBeenCalledWith(mockAuth, 'a@b.co', 'password1')
    expect(fb.sendEmailVerification).toHaveBeenCalledWith(FIREBASE_USER)
  })

  it('still succeeds when the verification email fails to send', async () => {
    fb.createUserWithEmailAndPassword.mockResolvedValue({ user: FIREBASE_USER })
    fb.sendEmailVerification.mockRejectedValue(firebaseError('auth/too-many-requests'))

    await expect(signUpWithEmail('a@b.co', 'password1')).resolves.toEqual({ ok: true, user: APP_USER })
  })

  it('returns a readable error when the account cannot be created', async () => {
    fb.createUserWithEmailAndPassword.mockRejectedValue(firebaseError('auth/email-already-in-use'))

    await expect(signUpWithEmail('a@b.co', 'password1')).resolves.toEqual({
      ok: false,
      error: 'An account with this email already exists. Try signing in.',
    })
    expect(fb.sendEmailVerification).not.toHaveBeenCalled()
  })
})

describe('signInWithGoogle', () => {
  it('exchanges the Google ID token for a Firebase sign-in', async () => {
    fb.signInWithCredential.mockResolvedValue({ user: FIREBASE_USER })

    await expect(signInWithGoogle('google-id-token')).resolves.toEqual({ ok: true, user: APP_USER })
    expect(fb.GoogleAuthProvider.credential).toHaveBeenCalledWith('google-id-token')
    expect(fb.signInWithCredential).toHaveBeenCalledWith(mockAuth, { providerId: 'google.com', token: 'google-id-token' })
  })

  it('returns a readable error', async () => {
    fb.signInWithCredential.mockRejectedValue(firebaseError('auth/operation-not-allowed'))

    await expect(signInWithGoogle('t')).resolves.toEqual({ ok: false, error: "This sign-in method isn't enabled yet." })
  })
})

describe('Apple', () => {
  it('creates a random nonce and its SHA-256 hash', async () => {
    await expect(createAppleNonce()).resolves.toEqual({ raw: 'raw-nonce', hashed: 'sha256(raw-nonce)' })
  })

  it('signs in with the identity token and the raw nonce', async () => {
    fb.signInWithCredential.mockResolvedValue({ user: FIREBASE_USER })

    await expect(signInWithApple('apple-token', 'raw-nonce')).resolves.toEqual({ ok: true, user: APP_USER })
    expect(fb.OAuthProvider).toHaveBeenCalledWith('apple.com')
    expect(fb.__appleCredential).toHaveBeenCalledWith({ idToken: 'apple-token', rawNonce: 'raw-nonce' })
    expect(fb.signInWithCredential).toHaveBeenCalledWith(mockAuth, {
      providerId: 'apple.com',
      idToken: 'apple-token',
      rawNonce: 'raw-nonce',
    })
  })

  it('returns a readable error', async () => {
    fb.signInWithCredential.mockRejectedValue(firebaseError('auth/invalid-credential'))

    await expect(signInWithApple('t', 'n')).resolves.toEqual({ ok: false, error: 'Incorrect email or password.' })
  })
})

describe('saveDisplayName', () => {
  it('updates the signed-in user profile', async () => {
    mockAuth.currentUser = FIREBASE_USER
    fb.updateProfile.mockResolvedValue(undefined)

    await saveDisplayName('Ada Lovelace')

    expect(fb.updateProfile).toHaveBeenCalledWith(FIREBASE_USER, { displayName: 'Ada Lovelace' })
  })

  it('does nothing when nobody is signed in', async () => {
    await saveDisplayName('Ada')
    expect(fb.updateProfile).not.toHaveBeenCalled()
  })

  it('never throws', async () => {
    mockAuth.currentUser = FIREBASE_USER
    fb.updateProfile.mockRejectedValue(new Error('network'))

    await expect(saveDisplayName('Ada')).resolves.toBeUndefined()
  })
})

describe('sendPasswordReset', () => {
  it('sends the reset email', async () => {
    fb.sendPasswordResetEmail.mockResolvedValue(undefined)

    await expect(sendPasswordReset('a@b.co')).resolves.toEqual({ ok: true })
    expect(fb.sendPasswordResetEmail).toHaveBeenCalledWith(mockAuth, 'a@b.co')
  })

  it('returns a readable error', async () => {
    fb.sendPasswordResetEmail.mockRejectedValue(firebaseError('auth/invalid-email'))

    await expect(sendPasswordReset('nope')).resolves.toEqual({ ok: false, error: 'That email address looks invalid.' })
  })
})

describe('signOut', () => {
  it('signs out of Firebase', async () => {
    fb.signOut.mockResolvedValue(undefined)
    await signOut()
    expect(fb.signOut).toHaveBeenCalledWith(mockAuth)
  })

  it('never throws', async () => {
    fb.signOut.mockRejectedValue(new Error('boom'))
    await expect(signOut()).resolves.toBeUndefined()
  })
})

describe('waitForInitialUser', () => {
  it('waits for the persisted sign-in to load, then returns the user', async () => {
    mockAuth.authStateReady.mockImplementation(async () => {
      mockAuth.currentUser = FIREBASE_USER
    })

    await expect(waitForInitialUser()).resolves.toEqual(APP_USER)
  })

  it('returns null when nobody is signed in', async () => {
    await expect(waitForInitialUser()).resolves.toBeNull()
  })

  it('rejects when Firebase cannot start, so the caller can log it', async () => {
    const failure = firebaseError('auth/invalid-api-key')
    mockAuthUnavailable = failure

    await expect(waitForInitialUser()).rejects.toBe(failure)
  })
})

describe('subscribeToAuthChanges', () => {
  it('reports app users (or null) and returns the unsubscribe function', () => {
    const unsubscribe = jest.fn()
    let listener: (user: unknown) => void = () => {}
    fb.onAuthStateChanged.mockImplementation((_auth: unknown, cb: typeof listener) => {
      listener = cb
      return unsubscribe
    })
    const onChange = jest.fn()

    const stop = subscribeToAuthChanges(onChange)
    listener(FIREBASE_USER)
    listener(null)
    stop()

    expect(fb.onAuthStateChanged).toHaveBeenCalledWith(mockAuth, expect.any(Function))
    expect(onChange).toHaveBeenNthCalledWith(1, APP_USER)
    expect(onChange).toHaveBeenNthCalledWith(2, null)
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('returns a no-op when Firebase cannot start', () => {
    mockAuthUnavailable = firebaseError('auth/invalid-api-key')

    const stop = subscribeToAuthChanges(jest.fn())

    expect(() => stop()).not.toThrow()
  })
})
