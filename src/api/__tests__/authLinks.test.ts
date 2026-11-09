import { createSessionFromAuthLink } from '@/src/api/authLinks'

jest.mock('@/src/api/supabase', () => ({
  supabase: { auth: { setSession: jest.fn() } },
}))

const { supabase } = jest.requireMock('@/src/api/supabase') as { supabase: { auth: { setSession: jest.Mock } } }
const setSession = supabase.auth.setSession

const SESSION = { access_token: 'acc', refresh_token: 'ref', user: { id: 'user-1', email: 'a@b.co' } }
const LINK = 'skycast://reset-password#access_token=acc&refresh_token=ref&type=recovery'

describe('createSessionFromAuthLink', () => {
  beforeEach(() => {
    setSession.mockReset()
  })

  it('establishes a session from the link tokens and reports the link type', async () => {
    setSession.mockResolvedValue({ data: { session: SESSION }, error: null })

    const outcome = await createSessionFromAuthLink(LINK)

    expect(setSession).toHaveBeenCalledWith({ access_token: 'acc', refresh_token: 'ref' })
    expect(outcome).toEqual({ status: 'session', session: SESSION, type: 'recovery' })
  })

  it('reports the error carried by the link without contacting Supabase', async () => {
    const outcome = await createSessionFromAuthLink(
      'skycast://reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
    )

    expect(setSession).not.toHaveBeenCalled()
    expect(outcome).toEqual({ status: 'error', message: 'This link has expired. Please request a new one.' })
  })

  it.each([['a bare link', 'skycast://reset-password'], ['no link', null]])('reports missing sign-in details for %s', async (_label, url) => {
    const outcome = await createSessionFromAuthLink(url)

    expect(setSession).not.toHaveBeenCalled()
    expect(outcome).toEqual({
      status: 'error',
      message: 'This link is missing its sign-in details. Please open it from your email again.',
    })
  })

  it('passes on the Supabase error when the tokens are rejected', async () => {
    setSession.mockResolvedValue({ data: { session: null }, error: { message: 'Invalid Refresh Token' } })

    await expect(createSessionFromAuthLink(LINK)).resolves.toEqual({ status: 'error', message: 'Invalid Refresh Token' })
  })

  it('fails safely when Supabase returns no session and no error', async () => {
    setSession.mockResolvedValue({ data: { session: null }, error: null })

    await expect(createSessionFromAuthLink(LINK)).resolves.toEqual({
      status: 'error',
      message: 'Could not start a session from this link.',
    })
  })

  it('turns an unexpected exception into an error outcome instead of throwing', async () => {
    setSession.mockRejectedValue(new Error('network down'))

    await expect(createSessionFromAuthLink(LINK)).resolves.toEqual({ status: 'error', message: 'network down' })
  })

  it('uses a generic message for non-Error exceptions', async () => {
    setSession.mockRejectedValue('weird')

    await expect(createSessionFromAuthLink(LINK)).resolves.toEqual({
      status: 'error',
      message: 'Could not start a session from this link.',
    })
  })
})
