import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/src/api/supabase'
import { parseAuthLink } from '@/src/utils/authLinks'

export type AuthLinkOutcome =
  | { status: 'session'; session: Session; type: string | null }
  | { status: 'error'; message: string }

const MISSING_DETAILS = 'This link is missing its sign-in details. Please open it from your email again.'
const NO_SESSION = 'Could not start a session from this link.'

/**
 * Turn a Supabase email redirect (password reset / confirmation) into a live session.
 * Never throws — every failure comes back as `{ status: 'error', message }` ready to show the user.
 */
export async function createSessionFromAuthLink(url: string | null | undefined): Promise<AuthLinkOutcome> {
  const link = parseAuthLink(url)
  if (link.kind === 'error') return { status: 'error', message: link.message }
  if (link.kind === 'none') return { status: 'error', message: MISSING_DETAILS }

  try {
    const { data, error } = await supabase.auth.setSession({
      access_token: link.accessToken,
      refresh_token: link.refreshToken,
    })
    if (error) return { status: 'error', message: error.message }
    if (!data.session) return { status: 'error', message: NO_SESSION }
    return { status: 'session', session: data.session, type: link.type }
  } catch (e: unknown) {
    return { status: 'error', message: e instanceof Error ? e.message : NO_SESSION }
  }
}
