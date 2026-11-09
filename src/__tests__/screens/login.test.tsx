import React from 'react'
import { Platform } from 'react-native'
import renderer, { act } from 'react-test-renderer'
import LoginScreen from '@/app/(auth)/login'
import { useAuthStore } from '@/src/store/authStore'
import { hasText, pressByProps, pressText, submitInput, typeInto } from '@/src/utils/testScreenHelpers'

// First render of a screen is slow under parallel workers (RN + icon transforms); 5s is too tight.
jest.setTimeout(30_000)

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn() }

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }))

jest.mock('@/src/api/supabase', () => ({
  supabase: { auth: { signInWithPassword: jest.fn(), signInWithIdToken: jest.fn(), updateUser: jest.fn() } },
}))

jest.mock('@/src/api/purchases', () => ({ loginUser: jest.fn() }))

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    getTokens: jest.fn(),
  },
  isErrorWithCode: (e: unknown) => typeof e === 'object' && e !== null && 'code' in e,
  statusCodes: {
    SIGN_IN_CANCELLED: 'CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'NO_PLAY_SERVICES',
  },
}))

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}))

const { supabase } = jest.requireMock('@/src/api/supabase') as {
  supabase: { auth: { signInWithPassword: jest.Mock; signInWithIdToken: jest.Mock; updateUser: jest.Mock } }
}
const { loginUser } = jest.requireMock('@/src/api/purchases') as { loginUser: jest.Mock }
const { GoogleSignin } = jest.requireMock('@react-native-google-signin/google-signin') as {
  GoogleSignin: Record<'configure' | 'hasPlayServices' | 'signIn' | 'getTokens', jest.Mock>
}
const AppleAuthentication = jest.requireMock('expo-apple-authentication') as { signInAsync: jest.Mock }

const SESSION = { access_token: 'tok', user: { id: 'user-1', email: 'a@b.co' } }
const restores: Array<() => void> = []

function setPlatform(os: 'ios' | 'android'): void {
  const original = Object.getOwnPropertyDescriptor(Platform, 'OS')
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true, writable: true })
  restores.push(() => {
    if (original) Object.defineProperty(Platform, 'OS', original)
  })
}

async function render(): Promise<renderer.ReactTestRenderer> {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(<LoginScreen />)
  })
  return tree
}

beforeEach(() => {
  supabase.auth.signInWithPassword.mockReset()
  supabase.auth.signInWithIdToken.mockReset()
  supabase.auth.updateUser.mockReset().mockResolvedValue({ data: {}, error: null })
  loginUser.mockReset().mockResolvedValue(false)
  Object.values(GoogleSignin).forEach((fn) => fn.mockReset())
  AppleAuthentication.signInAsync.mockReset()
  Object.values(mockRouter).forEach((fn) => fn.mockReset())
  useAuthStore.setState({ user: null, session: null, isLoading: false })
})

afterEach(() => {
  while (restores.length > 0) restores.pop()?.()
})

describe('LoginScreen — layout', () => {
  it('renders the welcome heading', async () => {
    const tree = await render()
    expect(hasText(tree, 'Welcome back')).toBe(true)
  })

  it('shows Google and Apple sign-in on iOS', async () => {
    setPlatform('ios')
    const tree = await render()
    expect(hasText(tree, 'Google')).toBe(true)
    expect(hasText(tree, 'Apple')).toBe(true)
  })

  it('shows Google but hides Apple sign-in on Android', async () => {
    setPlatform('android')
    const tree = await render()
    expect(hasText(tree, 'Google')).toBe(true)
    expect(hasText(tree, 'Apple')).toBe(false)
  })

  it('navigates to sign up and forgot-password', async () => {
    const tree = await render()

    await pressText(tree, 'Create one')
    expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/signup')

    await pressText(tree, 'Forgot?')
    expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/forgot')
  })

  it('dismisses from the close button', async () => {
    const tree = await render()
    await pressByProps(tree, { hitSlop: 16 })
    expect(mockRouter.back).toHaveBeenCalled()
  })
})

describe('LoginScreen — email and password', () => {
  it('requires both fields', async () => {
    const tree = await render()

    await pressText(tree, 'Sign In')

    expect(hasText(tree, 'Please enter your email and password.')).toBe(true)
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('signs in with a trimmed, lower-cased email, stores the session and dismisses', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { session: SESSION }, error: null })
    const tree = await render()
    typeInto(tree, 'you@example.com', '  A@B.co ')
    typeInto(tree, '••••••••', 'hunter2hunter2')

    await pressText(tree, 'Sign In')

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.co', password: 'hunter2hunter2' })
    expect(useAuthStore.getState().session).toBe(SESSION)
    expect(useAuthStore.getState().user).toBe(SESSION.user)
    expect(loginUser).toHaveBeenCalledWith('user-1')
    expect(mockRouter.back).toHaveBeenCalled()
  })

  it('also submits from the keyboard on the password field', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { session: SESSION }, error: null })
    const tree = await render()
    typeInto(tree, 'you@example.com', 'a@b.co')
    typeInto(tree, '••••••••', 'pw')

    await submitInput(tree, '••••••••')

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(1)
  })

  it('shows the auth error and does not dismiss or store a session', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: { message: 'Invalid login credentials' } })
    const tree = await render()
    typeInto(tree, 'you@example.com', 'a@b.co')
    typeInto(tree, '••••••••', 'wrong')

    await pressText(tree, 'Sign In')

    expect(hasText(tree, 'Invalid login credentials')).toBe(true)
    expect(useAuthStore.getState().session).toBeNull()
    expect(mockRouter.back).not.toHaveBeenCalled()
  })

  it('toggles password visibility', async () => {
    const tree = await render()
    const passwordInput = () => tree.root.findAll((n) => n.props.placeholder === '••••••••' && typeof n.props.onChangeText === 'function')[0]
    expect(passwordInput()?.props.secureTextEntry).toBe(true)

    await pressByProps(tree, { hitSlop: 8 })

    expect(passwordInput()?.props.secureTextEntry).toBe(false)
  })
})

describe('LoginScreen — Google', () => {
  function googleReady(idToken: string | null = 'google-id-token'): void {
    GoogleSignin.hasPlayServices.mockResolvedValue(true)
    GoogleSignin.signIn.mockResolvedValue({})
    GoogleSignin.getTokens.mockResolvedValue({ idToken })
  }

  it('exchanges the Google ID token for a session and dismisses', async () => {
    googleReady()
    supabase.auth.signInWithIdToken.mockResolvedValue({ data: { session: SESSION }, error: null })
    const tree = await render()

    await pressText(tree, 'Google')

    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({ provider: 'google', token: 'google-id-token' })
    expect(useAuthStore.getState().session).toBe(SESSION)
    expect(loginUser).toHaveBeenCalledWith('user-1')
    expect(mockRouter.back).toHaveBeenCalled()
  })

  it('reports a missing ID token without calling Supabase', async () => {
    googleReady(null)
    const tree = await render()

    await pressText(tree, 'Google')

    expect(hasText(tree, 'Google sign-in failed — no ID token returned.')).toBe(true)
    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled()
  })

  it('shows the Supabase error', async () => {
    googleReady()
    supabase.auth.signInWithIdToken.mockResolvedValue({ data: { session: null }, error: { message: 'Provider disabled' } })
    const tree = await render()

    await pressText(tree, 'Google')

    expect(hasText(tree, 'Provider disabled')).toBe(true)
    expect(mockRouter.back).not.toHaveBeenCalled()
  })

  it('stays silent when the user cancels', async () => {
    GoogleSignin.hasPlayServices.mockResolvedValue(true)
    GoogleSignin.signIn.mockRejectedValue({ code: 'CANCELLED' })
    const tree = await render()

    await pressText(tree, 'Google')

    expect(hasText(tree, 'Google sign-in failed. Please try again.')).toBe(false)
    expect(hasText(tree, 'Sign-in already in progress.')).toBe(false)
  })

  it.each([
    ['IN_PROGRESS', 'Sign-in already in progress.'],
    ['NO_PLAY_SERVICES', 'Google Play Services not available on this device.'],
    ['SOMETHING_ELSE', 'Google sign-in failed. Please try again.'],
  ])('maps the %s error code to a message', async (code, message) => {
    GoogleSignin.hasPlayServices.mockResolvedValue(true)
    GoogleSignin.signIn.mockRejectedValue({ code })
    const tree = await render()

    await pressText(tree, 'Google')

    expect(hasText(tree, message)).toBe(true)
  })

  it('shows a generic message for unexpected errors', async () => {
    GoogleSignin.hasPlayServices.mockRejectedValue(new Error('boom'))
    const tree = await render()

    await pressText(tree, 'Google')

    expect(hasText(tree, 'Google sign-in failed. Please try again.')).toBe(true)
  })
})

describe('LoginScreen — Apple', () => {
  beforeEach(() => setPlatform('ios'))

  it('exchanges the Apple identity token for a session and dismisses', async () => {
    AppleAuthentication.signInAsync.mockResolvedValue({ identityToken: 'apple-token' })
    supabase.auth.signInWithIdToken.mockResolvedValue({ data: { session: SESSION }, error: null })
    const tree = await render()

    await pressText(tree, 'Apple')

    expect(AppleAuthentication.signInAsync).toHaveBeenCalledWith({ requestedScopes: [0, 1] })
    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({ provider: 'apple', token: 'apple-token' })
    expect(useAuthStore.getState().session).toBe(SESSION)
    expect(mockRouter.back).toHaveBeenCalled()
  })

  it('shows the Supabase error', async () => {
    AppleAuthentication.signInAsync.mockResolvedValue({ identityToken: 'apple-token' })
    supabase.auth.signInWithIdToken.mockResolvedValue({ data: { session: null }, error: { message: 'Invalid token' } })
    const tree = await render()

    await pressText(tree, 'Apple')

    expect(hasText(tree, 'Invalid token')).toBe(true)
  })

  it.each([[null], [undefined], ['']])('refuses to continue without an identity token (%p) and never contacts Supabase', async (identityToken) => {
    AppleAuthentication.signInAsync.mockResolvedValue({ identityToken })
    const tree = await render()

    await pressText(tree, 'Apple')

    expect(hasText(tree, 'Apple sign-in failed — no identity token returned.')).toBe(true)
    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled()
    expect(useAuthStore.getState().session).toBeNull()
    expect(mockRouter.back).not.toHaveBeenCalled()
  })

  describe('saving the name Apple shares', () => {
    const signedIn = (fullName: object | null): void => {
      AppleAuthentication.signInAsync.mockResolvedValue({ identityToken: 'apple-token', fullName })
      supabase.auth.signInWithIdToken.mockResolvedValue({ data: { session: SESSION }, error: null })
    }

    it('stores the full name in the user profile on first sign-in', async () => {
      signedIn({ givenName: 'Ada', middleName: 'King', familyName: 'Lovelace' })
      const tree = await render()

      await pressText(tree, 'Apple')

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        data: { full_name: 'Ada King Lovelace', given_name: 'Ada', family_name: 'Lovelace' },
      })
    })

    it('skips missing name parts', async () => {
      signedIn({ givenName: 'Ada', middleName: null, familyName: null })
      const tree = await render()

      await pressText(tree, 'Apple')

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ data: { full_name: 'Ada', given_name: 'Ada' } })
    })

    it.each([[null], [{ givenName: null, middleName: null, familyName: null }], [{}]])('does nothing when Apple sends no name (%j)', async (fullName) => {
      signedIn(fullName)
      const tree = await render()

      await pressText(tree, 'Apple')

      expect(supabase.auth.updateUser).not.toHaveBeenCalled()
      expect(mockRouter.back).toHaveBeenCalled()
    })

    it('saves the name before dismissing the screen', async () => {
      signedIn({ givenName: 'Ada', familyName: 'Lovelace' })
      const tree = await render()

      await pressText(tree, 'Apple')

      expect(supabase.auth.updateUser.mock.invocationCallOrder[0]).toBeLessThan(mockRouter.back.mock.invocationCallOrder[0] ?? 0)
    })

    it('does not save a name when sign-in itself failed', async () => {
      AppleAuthentication.signInAsync.mockResolvedValue({ identityToken: 'apple-token', fullName: { givenName: 'Ada' } })
      supabase.auth.signInWithIdToken.mockResolvedValue({ data: { session: null }, error: { message: 'Invalid token' } })
      const tree = await render()

      await pressText(tree, 'Apple')

      expect(supabase.auth.updateUser).not.toHaveBeenCalled()
    })

    it('still signs the user in if saving the name fails', async () => {
      signedIn({ givenName: 'Ada' })
      supabase.auth.updateUser.mockResolvedValue({ data: {}, error: { message: 'profile update failed' } })
      const tree = await render()

      await pressText(tree, 'Apple')

      expect(useAuthStore.getState().session).toBe(SESSION)
      expect(mockRouter.back).toHaveBeenCalled()
      expect(hasText(tree, 'profile update failed')).toBe(false)
    })

    it('still signs the user in if saving the name throws', async () => {
      signedIn({ givenName: 'Ada' })
      supabase.auth.updateUser.mockRejectedValue(new Error('network'))
      const tree = await render()

      await pressText(tree, 'Apple')

      expect(useAuthStore.getState().session).toBe(SESSION)
      expect(mockRouter.back).toHaveBeenCalled()
    })
  })

  it('stays silent when the user cancels', async () => {
    AppleAuthentication.signInAsync.mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' })
    const tree = await render()

    await pressText(tree, 'Apple')

    expect(hasText(tree, 'Apple sign-in failed. Please try again.')).toBe(false)
  })

  it('shows a generic message for other failures', async () => {
    AppleAuthentication.signInAsync.mockRejectedValue(new Error('boom'))
    const tree = await render()

    await pressText(tree, 'Apple')

    expect(hasText(tree, 'Apple sign-in failed. Please try again.')).toBe(true)
  })
})
