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

jest.mock('@/src/api/auth', () => ({
  waitForInitialUser: jest.fn(),
  subscribeToAuthChanges: jest.fn(),
}))

jest.mock('@/src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

const { __premium: premium } = jest.requireMock('@/src/store/premiumStore') as {
  __premium: Record<'hydrate' | 'setPremium' | 'loadQueryCount', jest.Mock>
}
const purchases = jest.requireMock('@/src/api/purchases') as Record<'initPurchases' | 'checkPremiumStatus' | 'loginUser', jest.Mock>
const auth = jest.requireMock('@/src/api/auth') as Record<'waitForInitialUser' | 'subscribeToAuthChanges', jest.Mock>

const mockUseFonts = useFonts as jest.Mock
const USER = { id: 'user-1', email: 'a@b.co', displayName: null, emailVerified: true }
const unsubscribe = jest.fn()
let trees: renderer.ReactTestRenderer[] = []
let authListener: (user: unknown) => void = () => {}

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
  auth.waitForInitialUser.mockReset().mockResolvedValue(null)
  auth.subscribeToAuthChanges.mockReset().mockImplementation((cb: typeof authListener) => {
    authListener = cb
    return unsubscribe
  })
  ;(logger.error as jest.Mock).mockReset()
  useAuthStore.setState({ user: null, isLoading: false })
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

  it('checks RevenueCat directly and keeps the store signed out when nobody is signed in', async () => {
    purchases.checkPremiumStatus.mockResolvedValue(true)
    await render()
    await bootstrapped()

    expect(purchases.initPurchases).toHaveBeenCalled()
    expect(purchases.checkPremiumStatus).toHaveBeenCalled()
    expect(purchases.loginUser).not.toHaveBeenCalled()
    expect(useAuthStore.getState().user).toBeNull()
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

  it('restores the signed-in user and links RevenueCat to them', async () => {
    auth.waitForInitialUser.mockResolvedValue(USER)
    purchases.loginUser.mockResolvedValue(true)
    await render()
    await bootstrapped()

    expect(useAuthStore.getState().user).toBe(USER)
    expect(purchases.loginUser).toHaveBeenCalledWith('user-1')
    expect(purchases.checkPremiumStatus).not.toHaveBeenCalled()
    expect(premium.setPremium).toHaveBeenCalledWith(true)
  })

  it('follows later auth state changes and unsubscribes on unmount', async () => {
    const tree = await render()
    await bootstrapped()

    act(() => authListener(USER))
    expect(useAuthStore.getState().user).toBe(USER)

    act(() => authListener(null))
    expect(useAuthStore.getState().user).toBeNull()

    act(() => tree.unmount())
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('logs a bootstrap failure instead of crashing the app', async () => {
    const failure = new Error('firebase unavailable')
    auth.waitForInitialUser.mockRejectedValue(failure)
    const tree = await render()

    await waitFor(() => (logger.error as jest.Mock).mock.calls.length > 0)

    expect(logger.error).toHaveBeenCalledWith('app.bootstrap', failure)
    expect(tree.toJSON()).not.toBeUndefined()
  })
})
