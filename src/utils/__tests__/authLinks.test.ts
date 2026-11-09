import { AUTH_REDIRECTS, parseAuthLink } from '@/src/utils/authLinks'

const TOKENS = 'access_token=acc.tok.en&refresh_token=ref-tok&expires_in=3600&token_type=bearer'

describe('AUTH_REDIRECTS', () => {
  it('points reset and confirmation emails at the app scheme from app.json', () => {
    expect(AUTH_REDIRECTS.resetPassword).toBe('skycast://reset-password')
    expect(AUTH_REDIRECTS.confirmEmail).toBe('skycast://confirm-email')
  })
})

describe('parseAuthLink — sessions', () => {
  it('reads tokens and the link type from the URL fragment (implicit flow)', () => {
    expect(parseAuthLink(`skycast://reset-password#${TOKENS}&type=recovery`)).toEqual({
      kind: 'session',
      accessToken: 'acc.tok.en',
      refreshToken: 'ref-tok',
      type: 'recovery',
    })
  })

  it('reads tokens from the query string as well', () => {
    expect(parseAuthLink(`skycast://confirm-email?${TOKENS}&type=signup`)).toMatchObject({
      kind: 'session',
      accessToken: 'acc.tok.en',
      type: 'signup',
    })
  })

  it('prefers fragment values over query values', () => {
    expect(parseAuthLink('skycast://x?access_token=old&refresh_token=old#access_token=new&refresh_token=new')).toMatchObject({
      accessToken: 'new',
      refreshToken: 'new',
    })
  })

  it('reports a null type when the link has none', () => {
    expect(parseAuthLink(`skycast://confirm-email#${TOKENS}`)).toMatchObject({ kind: 'session', type: null })
  })

  it('decodes percent-encoded values', () => {
    expect(parseAuthLink('skycast://x#access_token=a%2Bb%3D&refresh_token=r%20t')).toMatchObject({
      accessToken: 'a+b=',
      refreshToken: 'r t',
    })
  })

  it('works with Expo Go style URLs', () => {
    expect(parseAuthLink(`exp://192.168.1.5:8081/--/reset-password#${TOKENS}&type=recovery`)).toMatchObject({ kind: 'session' })
  })
})

describe('parseAuthLink — errors', () => {
  it('turns an expired link into a friendly message', () => {
    const url = 'skycast://reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'

    expect(parseAuthLink(url)).toEqual({
      kind: 'error',
      code: 'otp_expired',
      message: 'This link has expired. Please request a new one.',
    })
  })

  it('surfaces the server description for other errors, decoding + as a space', () => {
    const url = 'skycast://reset-password#error=server_error&error_code=unexpected_failure&error_description=Something+went+wrong'

    expect(parseAuthLink(url)).toEqual({ kind: 'error', code: 'unexpected_failure', message: 'Something went wrong' })
  })

  it('falls back to a generic message and the error name as the code', () => {
    expect(parseAuthLink('skycast://reset-password#error=access_denied')).toEqual({
      kind: 'error',
      code: 'access_denied',
      message: 'This link is invalid.',
    })
  })

  it('treats an error as more important than tokens', () => {
    expect(parseAuthLink(`skycast://x#${TOKENS}&error=access_denied`)).toMatchObject({ kind: 'error' })
  })
})

describe('parseAuthLink — nothing usable', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['a bare deep link', 'skycast://reset-password'],
    ['a link with unrelated params', 'skycast://reset-password?foo=bar#baz=1'],
    ['only an access token', 'skycast://x#access_token=abc'],
    ['only a refresh token', 'skycast://x#refresh_token=abc'],
    ['empty token values', 'skycast://x#access_token=&refresh_token='],
  ])('returns none for %s', (_label, url) => {
    expect(parseAuthLink(url)).toEqual({ kind: 'none' })
  })

  it('does not throw on malformed percent-encoding', () => {
    expect(parseAuthLink('skycast://x#access_token=%E0%A4%A&refresh_token=%')).toMatchObject({ kind: 'session' })
  })
})
