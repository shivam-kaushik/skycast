import React from 'react'
import renderer, { act } from 'react-test-renderer'
import ResetPasswordScreen from '@/app/(auth)/reset-password'
import { useAuthStore } from '@/src/store/authStore'
import { deferred } from '@/src/utils/testFixtures'
import { hasText, hasTextContaining, inputByPlaceholder, pressByProps, pressText, submitInput, typeInto } from '@/src/utils/testScreenHelpers'

// First render of a screen is slow under parallel workers (RN + icon transforms); 5s is too tight.
jest.setTimeout(30_000)

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn() }
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }))

jest.mock('@/src/hooks/useAuthLink', () => ({ useAuthLink: jest.fn() }))
jest.mock('@/src/api/supabase', () => ({ supabase: { auth: { updateUser: jest.fn() } } }))
jest.mock('@/src/utils/postSignIn', () => ({ syncPurchasesForUser: jest.fn() }))

const { useAuthLink } = jest.requireMock('@/src/hooks/useAuthLink') as { useAuthLink: jest.Mock }
const { supabase } = jest.requireMock('@/src/api/supabase') as { supabase: { auth: { updateUser: jest.Mock } } }
const { syncPurchasesForUser } = jest.requireMock('@/src/utils/postSignIn') as { syncPurchasesForUser: jest.Mock }

const SESSION = { access_token: 'tok', user: { id: 'user-1', email: 'person@example.com' } }
const READY = { status: 'ready', session: SESSION, type: 'recovery' }
const NEW_PASSWORD = 'Min 8 characters'
const CONFIRM = 'Re-enter password'
let trees: renderer.ReactTestRenderer[] = []

async function render(): Promise<renderer.ReactTestRenderer> {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(<ResetPasswordScreen />)
  })
  trees.push(tree)
  return tree
}

function fill(tree: renderer.ReactTestRenderer, password: string, confirm: string): void {
  typeInto(tree, NEW_PASSWORD, password)
  typeInto(tree, CONFIRM, confirm)
}

beforeEach(() => {
  useAuthLink.mockReset().mockReturnValue(READY)
  supabase.auth.updateUser.mockReset()
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

describe('ResetPasswordScreen — verifying the link', () => {
  it('shows progress while the link is being verified', async () => {
    useAuthLink.mockReturnValue({ status: 'checking' })
    const tree = await render()

    expect(hasText(tree, 'Verifying your link…')).toBe(true)
    expect(tree.root.findAll((n) => n.props.placeholder === NEW_PASSWORD)).toHaveLength(0)
  })

  it('explains an expired or invalid link and offers a way forward', async () => {
    useAuthLink.mockReturnValue({ status: 'error', message: 'This link has expired. Please request a new one.' })
    const tree = await render()

    expect(hasText(tree, 'Link problem')).toBe(true)
    expect(hasText(tree, 'This link has expired. Please request a new one.')).toBe(true)
    expect(tree.root.findAll((n) => n.props.placeholder === NEW_PASSWORD)).toHaveLength(0)
  })

  it('sends the user back to request a new reset link', async () => {
    useAuthLink.mockReturnValue({ status: 'error', message: 'expired' })
    const tree = await render()

    await pressText(tree, 'Request a new link')

    expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/forgot')
  })

  it('offers to go back to sign in from the error state', async () => {
    useAuthLink.mockReturnValue({ status: 'error', message: 'expired' })
    const tree = await render()

    await pressText(tree, 'Back to Sign In')

    expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/login')
  })

  it.each([['signup'], ['magiclink'], [null]])('rejects a %s link, which cannot be used to reset a password', async (type) => {
    useAuthLink.mockReturnValue({ status: 'ready', session: SESSION, type })
    const tree = await render()

    expect(hasText(tree, 'Link problem')).toBe(true)
    expect(hasText(tree, "This isn't a password reset link.")).toBe(true)
    expect(tree.root.findAll((n) => n.props.placeholder === NEW_PASSWORD)).toHaveLength(0)
  })

  it('does not start a session from a non-recovery link', async () => {
    useAuthLink.mockReturnValue({ status: 'ready', session: SESSION, type: 'signup' })
    await render()

    expect(useAuthStore.getState().session).toBeNull()
    expect(syncPurchasesForUser).not.toHaveBeenCalled()
  })
})

describe('ResetPasswordScreen — choosing a new password', () => {
  it('shows the form for a valid recovery link, naming the account', async () => {
    const tree = await render()

    expect(hasText(tree, 'Set a new password')).toBe(true)
    expect(hasTextContaining(tree, 'person@example.com')).toBe(true)
    expect(hasText(tree, 'Update Password')).toBe(true)
  })

  it('signs the user in and links their purchases once the link is verified', async () => {
    const tree = await render()

    expect(useAuthStore.getState().session).toBe(SESSION)
    expect(useAuthStore.getState().user).toBe(SESSION.user)
    expect(syncPurchasesForUser).toHaveBeenCalledWith('user-1')

    await act(async () => {
      tree.update(<ResetPasswordScreen />)
    })
    expect(syncPurchasesForUser).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['', '', 'Please fill in all fields.'],
    ['short', 'short', 'Password must be at least 8 characters.'],
    ['password1', 'password2', 'Passwords do not match.'],
  ])('rejects invalid input locally (%p / %p)', async (password, confirm, message) => {
    const tree = await render()
    fill(tree, password, confirm)

    await pressText(tree, 'Update Password')

    expect(hasText(tree, message)).toBe(true)
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('updates the password exactly as typed and confirms', async () => {
    supabase.auth.updateUser.mockResolvedValue({ data: {}, error: null })
    const tree = await render()
    fill(tree, ' New Passw0rd ', ' New Passw0rd ')

    await pressText(tree, 'Update Password')

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: ' New Passw0rd ' })
    expect(hasText(tree, 'Password updated')).toBe(true)
    expect(tree.root.findAll((n) => n.props.placeholder === NEW_PASSWORD)).toHaveLength(0)
  })

  it('continues into the app after the password is updated', async () => {
    supabase.auth.updateUser.mockResolvedValue({ data: {}, error: null })
    const tree = await render()
    fill(tree, 'newpassword1', 'newpassword1')
    await pressText(tree, 'Update Password')

    await pressText(tree, 'Continue')

    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)')
  })

  it('shows the server error and keeps the form so the user can retry', async () => {
    supabase.auth.updateUser.mockResolvedValue({ data: {}, error: { message: 'New password should be different from the old password.' } })
    const tree = await render()
    fill(tree, 'newpassword1', 'newpassword1')

    await pressText(tree, 'Update Password')

    expect(hasText(tree, 'New password should be different from the old password.')).toBe(true)
    expect(hasText(tree, 'Password updated')).toBe(false)
    expect(hasText(tree, 'Update Password')).toBe(true)
  })

  it('clears an earlier error when the next attempt succeeds', async () => {
    supabase.auth.updateUser
      .mockResolvedValueOnce({ data: {}, error: { message: 'Try again' } })
      .mockResolvedValueOnce({ data: {}, error: null })
    const tree = await render()
    fill(tree, 'newpassword1', 'newpassword1')

    await pressText(tree, 'Update Password')
    expect(hasText(tree, 'Try again')).toBe(true)
    await pressText(tree, 'Update Password')

    expect(hasText(tree, 'Try again')).toBe(false)
    expect(hasText(tree, 'Password updated')).toBe(true)
  })

  it('shows a busy button while the update is in flight', async () => {
    const pending = deferred<{ data: object; error: null }>()
    supabase.auth.updateUser.mockReturnValue(pending.promise)
    const tree = await render()
    fill(tree, 'newpassword1', 'newpassword1')

    await pressText(tree, 'Update Password', { wait: false })

    expect(hasText(tree, 'Update Password')).toBe(false)

    await act(async () => {
      pending.resolve({ data: {}, error: null })
    })
    expect(hasText(tree, 'Password updated')).toBe(true)
  })

  it('submits from the keyboard on the confirmation field', async () => {
    supabase.auth.updateUser.mockResolvedValue({ data: {}, error: null })
    const tree = await render()
    fill(tree, 'newpassword1', 'newpassword1')

    await submitInput(tree, CONFIRM)

    expect(supabase.auth.updateUser).toHaveBeenCalledTimes(1)
  })

  it('toggles password visibility for both fields', async () => {
    const tree = await render()
    expect(inputByPlaceholder(tree, NEW_PASSWORD).props.secureTextEntry).toBe(true)
    expect(inputByPlaceholder(tree, CONFIRM).props.secureTextEntry).toBe(true)

    await pressByProps(tree, { hitSlop: 8 })

    expect(inputByPlaceholder(tree, NEW_PASSWORD).props.secureTextEntry).toBe(false)
    expect(inputByPlaceholder(tree, CONFIRM).props.secureTextEntry).toBe(false)
  })
})
