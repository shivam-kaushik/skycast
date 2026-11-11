import React from 'react'
import renderer, { act } from 'react-test-renderer'
import SignupScreen from '@/app/(auth)/signup'
import { useAuthStore } from '@/src/store/authStore'
import { hasText, hasTextContaining, inputByPlaceholder, pressByProps, pressText, typeInto } from '@/src/utils/testScreenHelpers'

// First render of a screen is slow under parallel workers (RN + icon transforms); 5s is too tight.
jest.setTimeout(30_000)

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn() }

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }))

jest.mock('@/src/api/auth', () => ({ signUpWithEmail: jest.fn() }))
jest.mock('@/src/api/purchases', () => ({ loginUser: jest.fn() }))

const { signUpWithEmail: signUp } = jest.requireMock('@/src/api/auth') as { signUpWithEmail: jest.Mock }
const { loginUser } = jest.requireMock('@/src/api/purchases') as { loginUser: jest.Mock }

const USER = { id: 'user-1', email: 'person@example.com', displayName: null, emailVerified: false }
const SIGNED_UP = { ok: true, user: USER }

async function render(): Promise<renderer.ReactTestRenderer> {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(<SignupScreen />)
  })
  return tree
}

function fill(tree: renderer.ReactTestRenderer, email: string, password: string, confirm: string): void {
  typeInto(tree, 'you@example.com', email)
  typeInto(tree, 'Min 8 characters', password)
  typeInto(tree, 'Re-enter password', confirm)
}

describe('SignupScreen', () => {
  beforeEach(() => {
    signUp.mockReset()
    loginUser.mockReset().mockResolvedValue(false)
    useAuthStore.setState({ user: null, isLoading: false })
    Object.values(mockRouter).forEach((fn) => fn.mockReset())
  })

  it('renders the create-account form', async () => {
    const tree = await render()
    expect(hasText(tree, 'Create account')).toBe(true)
    expect(hasText(tree, 'Create Account')).toBe(true)
  })

  it.each([
    ['', 'password1', 'password1', 'Please fill in all fields.'],
    ['a@b.co', '', '', 'Please fill in all fields.'],
    ['a@b.co', 'short', 'short', 'Password must be at least 8 characters.'],
    ['a@b.co', 'password1', 'password2', 'Passwords do not match.'],
  ])('rejects invalid input locally (%p / %p / %p)', async (email, password, confirm, message) => {
    const tree = await render()
    fill(tree, email, password, confirm)

    await pressText(tree, 'Create Account')

    expect(hasText(tree, message)).toBe(true)
    expect(signUp).not.toHaveBeenCalled()
  })

  it('creates the account with a trimmed, lower-cased email, signs in and mentions the verification email', async () => {
    signUp.mockResolvedValue(SIGNED_UP)
    const tree = await render()
    fill(tree, '  Person@Example.COM ', 'password1', 'password1')

    await pressText(tree, 'Create Account')

    expect(signUp).toHaveBeenCalledWith('person@example.com', 'password1')
    expect(useAuthStore.getState().user).toBe(USER)
    expect(loginUser).toHaveBeenCalledWith('user-1')
    expect(hasText(tree, "You're signed in")).toBe(true)
    expect(hasTextContaining(tree, 'person@example.com')).toBe(true)
  })

  it('dismisses from the success screen', async () => {
    signUp.mockResolvedValue(SIGNED_UP)
    const tree = await render()
    fill(tree, 'a@b.co', 'password1', 'password1')
    await pressText(tree, 'Create Account')

    await pressText(tree, 'Continue')

    expect(mockRouter.back).toHaveBeenCalled()
  })

  it('shows the server error and stays on the form', async () => {
    signUp.mockResolvedValue({ ok: false, error: 'An account with this email already exists. Try signing in.' })
    const tree = await render()
    fill(tree, 'a@b.co', 'password1', 'password1')

    await pressText(tree, 'Create Account')

    expect(hasText(tree, 'An account with this email already exists. Try signing in.')).toBe(true)
    expect(hasText(tree, "You're signed in")).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('submits from the keyboard on the confirm-password field', async () => {
    signUp.mockResolvedValue(SIGNED_UP)
    const tree = await render()
    fill(tree, 'a@b.co', 'password1', 'password1')

    await act(async () => {
      await inputByPlaceholder(tree, 'Re-enter password').props.onSubmitEditing()
    })

    expect(signUp).toHaveBeenCalledTimes(1)
  })

  it('toggles password visibility for both password fields', async () => {
    const tree = await render()
    expect(inputByPlaceholder(tree, 'Min 8 characters').props.secureTextEntry).toBe(true)
    expect(inputByPlaceholder(tree, 'Re-enter password').props.secureTextEntry).toBe(true)

    await pressByProps(tree, { hitSlop: 8 })

    expect(inputByPlaceholder(tree, 'Min 8 characters').props.secureTextEntry).toBe(false)
    expect(inputByPlaceholder(tree, 'Re-enter password').props.secureTextEntry).toBe(false)
  })

  it('goes back from the close button', async () => {
    const tree = await render()

    await pressByProps(tree, { hitSlop: 16 })

    expect(mockRouter.back).toHaveBeenCalled()
  })
})
