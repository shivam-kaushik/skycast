import React from 'react'
import renderer, { act } from 'react-test-renderer'
import ConfirmEmailScreen from '@/app/(auth)/confirm-email'
import { useAuthStore } from '@/src/store/authStore'
import { hasText, pressText } from '@/src/utils/testScreenHelpers'

// First render of a screen is slow under parallel workers (RN + icon transforms); 5s is too tight.
jest.setTimeout(30_000)

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn() }
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }))

jest.mock('@/src/hooks/useAuthLink', () => ({ useAuthLink: jest.fn() }))
jest.mock('@/src/utils/postSignIn', () => ({ syncPurchasesForUser: jest.fn() }))

const { useAuthLink } = jest.requireMock('@/src/hooks/useAuthLink') as { useAuthLink: jest.Mock }
const { syncPurchasesForUser } = jest.requireMock('@/src/utils/postSignIn') as { syncPurchasesForUser: jest.Mock }

const SESSION = { access_token: 'tok', user: { id: 'user-1', email: 'person@example.com' } }
let trees: renderer.ReactTestRenderer[] = []

async function render(): Promise<renderer.ReactTestRenderer> {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(<ConfirmEmailScreen />)
  })
  trees.push(tree)
  return tree
}

beforeEach(() => {
  useAuthLink.mockReset().mockReturnValue({ status: 'ready', session: SESSION, type: 'signup' })
  syncPurchasesForUser.mockReset().mockResolvedValue(undefined)
  Object.values(mockRouter).forEach((fn) => fn.mockReset())
  useAuthStore.setState({ user: null, session: null, isLoading: false })
})

afterEach(() => {
  act(() => {
    trees.forEach((t) => t.unmount())
  })
  trees = []
})

describe('ConfirmEmailScreen', () => {
  it('shows progress while the link is being verified', async () => {
    useAuthLink.mockReturnValue({ status: 'checking' })
    const tree = await render()

    expect(hasText(tree, 'Confirming your email…')).toBe(true)
    expect(useAuthStore.getState().session).toBeNull()
  })

  it('confirms the email and signs the user in', async () => {
    const tree = await render()

    expect(hasText(tree, 'Email confirmed')).toBe(true)
    expect(hasText(tree, "You're signed in as person@example.com.")).toBe(true)
    expect(useAuthStore.getState().session).toBe(SESSION)
    expect(useAuthStore.getState().user).toBe(SESSION.user)
  })

  it('links the user’s purchases exactly once', async () => {
    const tree = await render()

    await act(async () => {
      tree.update(<ConfirmEmailScreen />)
    })

    expect(syncPurchasesForUser).toHaveBeenCalledTimes(1)
    expect(syncPurchasesForUser).toHaveBeenCalledWith('user-1')
  })

  it('accepts a session link of any type, since the user only needs to be verified', async () => {
    useAuthLink.mockReturnValue({ status: 'ready', session: SESSION, type: 'email' })
    const tree = await render()

    expect(hasText(tree, 'Email confirmed')).toBe(true)
  })

  it('falls back to a generic sign-in message when the account has no email', async () => {
    useAuthLink.mockReturnValue({ status: 'ready', session: { ...SESSION, user: { id: 'user-2' } }, type: 'signup' })
    const tree = await render()

    expect(hasText(tree, "You're signed in.")).toBe(true)
  })

  it('continues into the app', async () => {
    const tree = await render()

    await pressText(tree, 'Continue')

    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)')
  })

  it('explains a bad or expired link and does not sign anyone in', async () => {
    useAuthLink.mockReturnValue({ status: 'error', message: 'This link has expired. Please request a new one.' })
    const tree = await render()

    expect(hasText(tree, 'Confirmation problem')).toBe(true)
    expect(hasText(tree, 'This link has expired. Please request a new one.')).toBe(true)
    expect(hasText(tree, 'Your email may already be confirmed — try signing in.')).toBe(true)
    expect(useAuthStore.getState().session).toBeNull()
    expect(syncPurchasesForUser).not.toHaveBeenCalled()
  })

  it('sends the user to sign in from the error state', async () => {
    useAuthLink.mockReturnValue({ status: 'error', message: 'expired' })
    const tree = await render()

    await pressText(tree, 'Go to Sign In')

    expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/login')
  })
})
