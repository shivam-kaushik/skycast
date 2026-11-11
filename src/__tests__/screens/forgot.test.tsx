import React from 'react'
import renderer, { act } from 'react-test-renderer'
import ForgotScreen from '@/app/(auth)/forgot'
import { hasText, hasTextContaining, pressByProps, pressText, submitInput, typeInto } from '@/src/utils/testScreenHelpers'

// First render of a screen is slow under parallel workers (RN + icon transforms); 5s is too tight.
jest.setTimeout(30_000)

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn() }

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }))

jest.mock('@/src/api/auth', () => ({ sendPasswordReset: jest.fn() }))

const { sendPasswordReset: resetPasswordForEmail } = jest.requireMock('@/src/api/auth') as {
  sendPasswordReset: jest.Mock
}

async function render(): Promise<renderer.ReactTestRenderer> {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(<ForgotScreen />)
  })
  return tree
}

describe('ForgotScreen', () => {
  beforeEach(() => {
    resetPasswordForEmail.mockReset()
    Object.values(mockRouter).forEach((fn) => fn.mockReset())
  })

  it('renders the reset form', async () => {
    const tree = await render()
    expect(hasText(tree, 'Reset password')).toBe(true)
    expect(hasText(tree, 'Send Reset Link')).toBe(true)
  })

  it('asks for an email before sending', async () => {
    const tree = await render()

    await pressText(tree, 'Send Reset Link')

    expect(hasText(tree, 'Please enter your email address.')).toBe(true)
    expect(resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('requests a reset for the trimmed, lower-cased email', async () => {
    resetPasswordForEmail.mockResolvedValue({ ok: true })
    const tree = await render()
    typeInto(tree, 'you@example.com', '  Person@Example.COM ')

    await pressText(tree, 'Send Reset Link')

    expect(resetPasswordForEmail).toHaveBeenCalledWith('person@example.com')
    expect(hasText(tree, 'Check your email')).toBe(true)
    expect(hasTextContaining(tree, 'person@example.com')).toBe(true)
  })

  it('also sends from the keyboard', async () => {
    resetPasswordForEmail.mockResolvedValue({ ok: true })
    const tree = await render()
    typeInto(tree, 'you@example.com', 'a@b.co')

    await submitInput(tree, 'you@example.com')

    expect(resetPasswordForEmail).toHaveBeenCalledTimes(1)
  })

  it('shows the server error and keeps the form', async () => {
    resetPasswordForEmail.mockResolvedValue({ ok: false, error: 'Rate limit exceeded' })
    const tree = await render()
    typeInto(tree, 'you@example.com', 'a@b.co')

    await pressText(tree, 'Send Reset Link')

    expect(hasText(tree, 'Rate limit exceeded')).toBe(true)
    expect(hasText(tree, 'Check your email')).toBe(false)
  })

  it('returns to sign in from the form and from the confirmation screen', async () => {
    const tree = await render()
    await pressText(tree, 'Sign In')
    expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/login')

    mockRouter.replace.mockReset()
    resetPasswordForEmail.mockResolvedValue({ ok: true })
    typeInto(tree, 'you@example.com', 'a@b.co')
    await pressText(tree, 'Send Reset Link')
    await pressText(tree, 'Back to Sign In')
    expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/login')
  })

  it('goes back from the close button', async () => {
    const tree = await render()

    await pressByProps(tree, { hitSlop: 16 })

    expect(mockRouter.back).toHaveBeenCalled()
  })
})
