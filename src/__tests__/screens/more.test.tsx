import React from 'react'
import { Switch } from 'react-native'
import renderer, { act } from 'react-test-renderer'
import type { AuthUser } from '@/src/api/auth'
import MoreScreen from '@/app/(tabs)/more'
import { useAuthStore } from '@/src/store/authStore'
import { usePrefsStore } from '@/src/store/prefsStore'
import { hasText, hasTextContaining, pressByProps, pressText } from '@/src/utils/testScreenHelpers'

// First render of a screen is slow under parallel workers (RN + icon transforms); 5s is too tight.
jest.setTimeout(30_000)

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn() }
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }))

jest.mock('@/src/api/auth', () => ({ signOut: jest.fn() }))
jest.mock('@/src/api/purchases', () => ({ logoutUser: jest.fn() }))

jest.mock('@/src/store/premiumStore', () => {
  const state = {
    isPremium: false,
    isDevUnlocked: false,
    loadQueryCount: jest.fn(),
    toggleDevUnlock: jest.fn(),
    setPremium: jest.fn(),
  }
  return { usePremiumStore: () => state, __premiumState: state }
})

// Data hooks report "no data yet" so the screen renders its section chrome without insight cards.
jest.mock('@/src/hooks/useWeather', () => ({ useWeather: () => ({ data: undefined, isLoading: false }) }))
jest.mock('@/src/hooks/useAirQuality', () => ({ useAirQuality: () => ({ data: undefined }) }))
jest.mock('@/src/hooks/useEra5History', () => ({
  useEra5History: () => ({ data: undefined, isLoading: false, error: null }),
}))
jest.mock('@/src/hooks/usePressureAlert', () => ({
  usePressureAlert: () => ({ alert: false, delta: 0, direction: 'falling', windowStart: 0 }),
}))

const stubComponent = { __esModule: true, default: () => null }
jest.mock('@/src/components/home/PersonaSwitcher', () => stubComponent)
jest.mock('@/src/components/more/ActivityWeekOutlook', () => stubComponent)
jest.mock('@/src/components/more/AIChatSheet', () => stubComponent)
jest.mock('@/src/components/more/AIFeaturesCard', () => stubComponent)
jest.mock('@/src/components/more/HealthInsightsCard', () => stubComponent)
jest.mock('@/src/components/more/HistoryBriefCard', () => stubComponent)
jest.mock('@/src/components/more/TripBriefingCard', () => stubComponent)
jest.mock('@/src/components/more/WardrobeAdvisorCard', () => stubComponent)
jest.mock('@/src/components/shared/PaywallModal', () => stubComponent)
jest.mock('@/src/components/shared/PremiumGate', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => children ?? null,
}))

const { signOut } = jest.requireMock('@/src/api/auth') as { signOut: jest.Mock }
const { logoutUser } = jest.requireMock('@/src/api/purchases') as { logoutUser: jest.Mock }
const { __premiumState: premium } = jest.requireMock('@/src/store/premiumStore') as {
  __premiumState: {
    isPremium: boolean
    isDevUnlocked: boolean
    loadQueryCount: jest.Mock
    toggleDevUnlock: jest.Mock
    setPremium: jest.Mock
  }
}

const USER: AuthUser = { id: 'user-1', email: 'person@example.com', displayName: null, emailVerified: true }
const INITIAL_PREFS = usePrefsStore.getState()
let trees: renderer.ReactTestRenderer[] = []

async function render(): Promise<renderer.ReactTestRenderer> {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(<MoreScreen />)
  })
  trees.push(tree)
  return tree
}

beforeEach(() => {
  Object.values(mockRouter).forEach((fn) => fn.mockReset())
  signOut.mockReset().mockResolvedValue(undefined)
  logoutUser.mockReset().mockResolvedValue(undefined)
  premium.isPremium = false
  premium.isDevUnlocked = false
  premium.loadQueryCount.mockReset()
  premium.toggleDevUnlock.mockReset()
  premium.setPremium.mockReset().mockResolvedValue(undefined)
  usePrefsStore.setState(INITIAL_PREFS, true)
  useAuthStore.setState({ user: null, isLoading: false })
})

afterEach(() => {
  act(() => {
    trees.forEach((t) => t.unmount())
  })
  trees = []
})

describe('MoreScreen — account (signed out)', () => {
  it('invites the user to sign in or create an account', async () => {
    const tree = await render()

    expect(hasText(tree, 'Sign in to sync your account across all your devices.')).toBe(true)
    expect(hasText(tree, 'Sign In')).toBe(true)
    expect(hasText(tree, 'Create Account')).toBe(true)
    expect(hasText(tree, 'Sign Out')).toBe(false)
  })

  it('opens the login screen', async () => {
    const tree = await render()
    await pressText(tree, 'Sign In')
    expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/login')
  })

  it('opens the signup screen', async () => {
    const tree = await render()
    await pressText(tree, 'Create Account')
    expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/signup')
  })
})

describe('MoreScreen — account (signed in)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: USER })
  })

  it('shows the email and hides the sign-in options', async () => {
    const tree = await render()

    expect(hasText(tree, 'person@example.com')).toBe(true)
    expect(hasText(tree, 'Sign Out')).toBe(true)
    expect(hasText(tree, 'Create Account')).toBe(false)
  })

  it('shows a free plan without a premium badge for non-premium users', async () => {
    const tree = await render()

    expect(hasText(tree, 'Free plan')).toBe(true)
    expect(hasText(tree, '★ Premium')).toBe(false)
  })

  it('shows the premium badge for premium users', async () => {
    premium.isPremium = true
    const tree = await render()

    expect(hasText(tree, 'Premium member')).toBe(true)
    expect(hasText(tree, '★ Premium')).toBe(true)
  })

  it('signs out of RevenueCat then Firebase, clears the user and revokes premium', async () => {
    useAuthStore.setState({ user: USER })
    const tree = await render()

    await pressText(tree, 'Sign Out')

    expect(logoutUser).toHaveBeenCalledTimes(1)
    expect(signOut).toHaveBeenCalledTimes(1)
    expect(logoutUser.mock.invocationCallOrder[0]).toBeLessThan(signOut.mock.invocationCallOrder[0] ?? 0)
    expect(useAuthStore.getState().user).toBeNull()
    expect(premium.setPremium).toHaveBeenCalledWith(false)
    expect(hasText(tree, 'Sign In')).toBe(true)
  })
})

describe('MoreScreen — settings', () => {
  it('switches the temperature unit', async () => {
    const tree = await render()

    await pressText(tree, 'Fahrenheit')
    expect(usePrefsStore.getState().unit).toBe('F')

    await pressText(tree, 'Celsius')
    expect(usePrefsStore.getState().unit).toBe('C')
  })

  it('toggles an alert subscription', async () => {
    const tree = await render()
    const [firstSwitch] = tree.root.findAllByType(Switch)
    const [firstKey] = Object.keys(usePrefsStore.getState().alertsEnabled) as Array<
      keyof ReturnType<typeof usePrefsStore.getState>['alertsEnabled']
    >
    const before = usePrefsStore.getState().alertsEnabled[firstKey]

    act(() => {
      firstSwitch?.props.onValueChange(!before)
    })

    expect(usePrefsStore.getState().alertsEnabled[firstKey]).toBe(!before)
  })

  it('loads the AI query count on mount', async () => {
    await render()
    expect(premium.loadQueryCount).toHaveBeenCalled()
  })
})

describe('MoreScreen — version label', () => {
  const versionTap = (tree: renderer.ReactTestRenderer) => pressByProps(tree, { activeOpacity: 1 })

  it('shows the plain version by default', async () => {
    const tree = await render()
    expect(hasText(tree, 'Skycast v1.0.0')).toBe(true)
  })

  it('counts down the taps needed to toggle dev mode', async () => {
    const tree = await render()

    await versionTap(tree)
    await versionTap(tree)
    await versionTap(tree)

    expect(hasTextContaining(tree, '(4 more)')).toBe(true)
    expect(premium.toggleDevUnlock).not.toHaveBeenCalled()
  })

  it('toggles dev mode on the seventh tap and resets the counter', async () => {
    const tree = await render()

    for (let i = 0; i < 7; i++) await versionTap(tree)

    expect(premium.toggleDevUnlock).toHaveBeenCalledTimes(1)
    expect(hasTextContaining(tree, 'more)')).toBe(false)
  })

  it('labels premium and dev-unlocked states', async () => {
    premium.isPremium = true
    let tree = await render()
    expect(hasTextContaining(tree, '★ Premium')).toBe(true)

    premium.isDevUnlocked = true
    tree = await render()
    expect(hasTextContaining(tree, 'Dev Mode ON')).toBe(true)
  })
})
