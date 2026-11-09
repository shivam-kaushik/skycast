/**
 * Deep links Supabase emails send back into the app (password reset, email confirmation).
 * The scheme comes from `app.json` (`"scheme": "skycast"`). Both URLs must be allowed in
 * Supabase → Authentication → URL Configuration → Redirect URLs (e.g. `skycast://**`).
 */
export const AUTH_REDIRECTS = {
  resetPassword: 'skycast://reset-password',
  confirmEmail: 'skycast://confirm-email',
} as const

export type ParsedAuthLink =
  | { kind: 'session'; accessToken: string; refreshToken: string; type: string | null }
  | { kind: 'error'; code: string | null; message: string }
  | { kind: 'none' }

const NONE: ParsedAuthLink = { kind: 'none' }

function decode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '))
  } catch {
    return value
  }
}

/** Parse `a=1&b=2` by hand — React Native's URLSearchParams has historically been incomplete. */
function parseParams(part: string): Record<string, string> {
  const params: Record<string, string> = {}
  for (const pair of part.split('&')) {
    if (!pair) continue
    const eq = pair.indexOf('=')
    const key = decode(eq < 0 ? pair : pair.slice(0, eq))
    params[key] = eq < 0 ? '' : decode(pair.slice(eq + 1))
  }
  return params
}

function friendlyError(code: string | null, description: string | undefined): string {
  if (code === 'otp_expired') return 'This link has expired. Please request a new one.'
  return description?.trim() || 'This link is invalid.'
}

/**
 * Read what Supabase put in a redirect URL. With the default implicit flow the tokens arrive in the
 * fragment (`#access_token=…&refresh_token=…&type=recovery`); failures arrive as
 * `#error=…&error_code=…&error_description=…`. Query-string values are accepted too; the fragment wins.
 * Never logs or returns anything beyond what the caller needs — the URL holds live credentials.
 */
export function parseAuthLink(url: string | null | undefined): ParsedAuthLink {
  if (!url) return NONE

  const hash = url.indexOf('#')
  const beforeHash = hash >= 0 ? url.slice(0, hash) : url
  const fragment = hash >= 0 ? url.slice(hash + 1) : ''
  const question = beforeHash.indexOf('?')
  const query = question >= 0 ? beforeHash.slice(question + 1) : ''
  const params = { ...parseParams(query), ...parseParams(fragment) }

  if (params.error || params.error_code || params.error_description) {
    const code = params.error_code || params.error || null
    return { kind: 'error', code, message: friendlyError(code, params.error_description) }
  }

  if (params.access_token && params.refresh_token) {
    return {
      kind: 'session',
      accessToken: params.access_token,
      refreshToken: params.refresh_token,
      type: params.type || null,
    }
  }

  return NONE
}
