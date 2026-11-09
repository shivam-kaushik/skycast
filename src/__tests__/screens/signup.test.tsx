import React from 'react'
import renderer, { act } from 'react-test-renderer'
import SignupScreen from '@/app/(auth)/signup'
import { AUTH_REDIRECTS } from '@/src/utils/authLinks'
import { hasText, hasTextContaining, inputByPlaceholder, pressByProps, pressText, typeInto } from '@/src/utils/testScreenHelpers'

// First render of a screen is slow under parallel workers (RN + icon transforms); 5s is too tight.
jest.setTimeout(30_000)

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn() }

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }))

jest.mock('@/src/api/supabase', () => ({
  supabase: { auth: { signUp: jest.fn() } },
}))

const { supabase } = jest.requireMock('@/src/api/supabase') as {
  supabase: { auth: { signUp: jest.Mock } }
}
const signUp = supabase.auth.signUp

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

  it('signs up with a trimmed, lower-cased email and shows the confirmation screen', async () => {
    signUp.mockResolvedValue({ data: {}, error: null })
    const tree = await render()
    fill(tree, '  Person@Example.COM ', 'password1', 'password1')

    await pressText(tree, 'Create Account')

    expect(signUp).toHaveBeenCalledWith({
      email: 'person@example.com',
      password: 'password1',
      options: { emailRedirectTo: 'skycast://confirm-email' },
    })
    expect(hasText(tree, 'Check your email')).toBe(true)
    expect(hasTextContaining(tree, 'person@example.com')).toBe(true)
  })

  it('makes the confirmation email open the app instead of the project Site URL', async () => {
    signUp.mockResolvedValue({ data: {}, error: null })
    const tree = await render()
    fill(tree, 'a@b.co', 'password1', 'password1')

    await pressText(tree, 'Create Account')

    expect(signUp.mock.calls[0]?.[0].options.emailRedirectTo).toBe(AUTH_REDIRECTS.confirmEmail)
  })

  it('returns to sign in from the confirmation screen', async () => {
    signUp.mockResolvedValue({ data: {}, error: null })
    const tree = await render()
    fill(tree, 'a@b.co', 'password1', 'password1')
    await pressText(tree, 'Create Account')

    await pressText(tree, 'Back to Sign In')

    expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/login')
  })

  it('shows the server error and stays on the form', async () => {
    signUp.mockResolvedValue({ data: {}, error: { message: 'User already registered' } })
    const tree = await render()
    fill(tree, 'a@b.co', 'password1', 'password1')

    await pressText(tree, 'Create Account')

    expect(hasText(tree, 'User already registered')).toBe(true)
    expect(hasText(tree, 'Check your email')).toBe(false)
  })

  it('submits from the keyboard on the confirm-password field', async () => {
    signUp.mockResolvedValue({ data: {}, error: null })
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
