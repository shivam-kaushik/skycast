import React from 'react'
import renderer, { act } from 'react-test-renderer'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import RootLayout from '@/app/_layout'
import { useAuthStore } from '@/src/store/authStore'
import { logger } from '@/src/utils/logger'
import { waitFor } from '@/src/utils/testHookHarness'

// First render of a screen is slow under parallel workers (RN + icon transforms); 5s is too tight.
jest.setTimeout(30_000)

jest.mock('expo-font', () => ({ useFonts: jest.fn() }))

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}))

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react') as typeof import('react')
  const Stack = Object.assign(
    ({ children }: { children?: React.ReactNode }) => R.createElement(R.Fragment, null, children),
    { Screen: () => null },
  )
  return { Stack, ErrorBoundary: () => null }
})

jest.mock('@/src/hooks/useLocation', () => ({ useLocation: jest.fn() }))

jest.mock('@/src/store/premiumStore', () => {
  const premium = { hydrate: jest.fn(), setPremium: jest.fn(), loadQueryCount: jest.fn() }
  return { usePremiumStore: () => premium, __premium: premium }
})

jest.mock('@/src/api/purchases', () => ({
  initPurchases: jest.fn(),
  checkPremiumStatus: jest.fn(),
  loginUser: jest.fn(),
}))

jest.mock('@/src/api/supabase', () => ({
  supabase: { auth: { getSession: jest.fn(), onAuthStateChange: jest.fn() } },
}))

jest.mock('@/src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

const { __premium: premium } = jest.requireMock('@/src/store/premiumStore') as {
  __premium: Record<'hydrate' | 'setPremium' | 'loadQueryCount', jest.Mock>
}
const purchases = jest.requireMock('@/src/api/purchases') as Record<'initPurchases' | 'checkPremiumStatus' | 'loginUser', jest.Mock>
const { supabase } = jest.requireMock('@/src/api/supabase') as {
  supabase: { auth: { getSession: jest.Mock; onAuthStateChange: jest.Mock } }
}

const mockUseFonts = useFonts as jest.Mock
const SESSION = { access_token: 'tok', user: { id: 'user-1', email: 'a@b.co' } }
const unsubscribe = jest.fn()
let trees: renderer.ReactTestRenderer[] = []
let authListener: (event: string, session: unknown) => void = () => {}

async function render(): Promise<renderer.ReactTestRenderer> {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(<RootLayout />)
  })
  trees.push(tree)
  return tree
}

/** Wait for the async bootstrap to finish (it ends by writing premium status). */
async function bootstrapped(): Promise<void> {
  await waitFor(() => premium.setPremium.mock.calls.length > 0)
}

beforeEach(() => {
  mockUseFonts.mockReset().mockReturnValue([true, null])
  ;(SplashScreen.hideAsync as jest.Mock).mockReset()
  Object.values(premium).forEach((fn) => fn.mockReset().mockResolvedValue(undefined))
  Object.values(purchases).forEach((fn) => fn.mockReset())
  purchases.initPurchases.mockResolvedValue(undefined)
  purchases.checkPremiumStatus.mockResolvedValue(false)
  purchases.loginUser.mockResolvedValue(false)
  unsubscribe.mockReset()
  supabase.auth.getSession.mockReset().mockResolvedValue({ data: { session: null } })
  supabase.auth.onAuthStateChange.mockReset().mockImplementation((cb: typeof authListener) => {
    authListener = cb
    return { data: { subscription: { unsubscribe } } }
  })
  ;(logger.error as jest.Mock).mockReset()
  useAuthStore.setState({ user: null, session: null, isLoading: false })
})

afterEach(() => {
  act(() => {
    trees.forEach((t) => t.unmount())
  })
  trees = []
})

describe('RootLayout — fonts and splash', () => {
  it('renders nothing and keeps the splash screen while fonts load', async () => {
    mockUseFonts.mockReturnValue([false, null])
    const tree = await render()

    expect(tree.toJSON()).toBeNull()
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled()
  })

  it('hides the splash screen once fonts are loaded', async () => {
    await render()
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1)
  })

  it('logs and rethrows a font loading failure', async () => {
    const failure = new Error('font failure')
    mockUseFonts.mockReturnValue([false, failure])

    await expect(render()).rejects.toThrow('font failure')
    expect(logger.error).toHaveBeenCalledWith('app.fonts', failure, { message: 'font loading failed' })
  })
})

describe('RootLayout — premium/auth bootstrap', () => {
  it('restores persisted premium before anything else', async () => {
    await render()
    await bootstrapped()
    expect(premium.hydrate).toHaveBeenCalledTimes(1)
  })

  it('checks RevenueCat directly and keeps the store signed out when there is no session', async () => {
    purchases.checkPremiumStatus.mockResolvedValue(true)
    await render()
    await bootstrapped()

    expect(purchases.initPurchases).toHaveBeenCalled()
    expect(purchases.checkPremiumStatus).toHaveBeenCalled()
    expect(purchases.loginUser).not.toHaveBeenCalled()
    expect(useAuthStore.getState().session).toBeNull()
    expect(premium.setPremium).toHaveBeenCalledWith(true)
    expect(premium.loadQueryCount).toHaveBeenCalled()
    expect(useAuthStore.getState().isLoading).toBe(false)
  })

  it('does not load the AI query count for non-premium users', async () => {
    purchases.checkPremiumStatus.mockResolvedValue(false)
    await render()
    await bootstrapped()

    expect(premium.setPremium).toHaveBeenCalledWith(false)
    expect(premium.loadQueryCount).not.toHaveBeenCalled()
  })

  it('restores the session and links RevenueCat to the signed-in user', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: SESSION } })
    purchases.loginUser.mockResolvedValue(true)
    await render()
    await bootstrapped()

    expect(useAuthStore.getState().session).toBe(SESSION)
    expect(useAuthStore.getState().user).toBe(SESSION.user)
    expect(purchases.loginUser).toHaveBeenCalledWith('user-1')
    expect(purchases.checkPremiumStatus).not.toHaveBeenCalled()
    expect(premium.setPremium).toHaveBeenCalledWith(true)
  })

  it('follows later auth state changes and unsubscribes on unmount', async () => {
    const tree = await render()
    await bootstrapped()

    act(() => authListener('SIGNED_IN', SESSION))
    expect(useAuthStore.getState().session).toBe(SESSION)

    act(() => authListener('SIGNED_OUT', null))
    expect(useAuthStore.getState().session).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()

    act(() => tree.unmount())
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('logs a bootstrap failure instead of crashing the app', async () => {
    const failure = new Error('secure store unavailable')
    supabase.auth.getSession.mockRejectedValue(failure)
    const tree = await render()

    await waitFor(() => (logger.error as jest.Mock).mock.calls.length > 0)

    expect(logger.error).toHaveBeenCalledWith('app.bootstrap', failure)
    expect(tree.toJSON()).not.toBeUndefined()
  })
})
