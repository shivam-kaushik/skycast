import { useEffect, useRef, useState } from 'react'
import * as Linking from 'expo-linking'
import type { Session } from '@supabase/supabase-js'
import { createSessionFromAuthLink } from '@/src/api/authLinks'

export type AuthLinkState =
  | { status: 'checking' }
  | { status: 'ready'; session: Session; type: string | null }
  | { status: 'error'; message: string }

const NO_LINK_MESSAGE = 'Open the link from your email on this device to continue.'

/**
 * For screens a Supabase email link opens (password reset, email confirmation): reads the incoming
 * deep link and exchanges it for a session.
 *
 * `checking` until the link is exchanged, `ready` with the session on success, `error` with a message
 * to show if the link is bad/expired — or if no link shows up within `graceMs` (the screen was opened
 * manually). A link arriving after that still wins.
 */
export function useAuthLink(graceMs = 1500): AuthLinkState {
  const url = Linking.useLinkingURL()
  const [state, setState] = useState<AuthLinkState>({ status: 'checking' })
  const latestUrl = useRef<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!url) return
    latestUrl.current = url
    setState({ status: 'checking' })
    void createSessionFromAuthLink(url).then((outcome) => {
      // Drop results for an unmounted screen or a link that has since been replaced.
      if (!mounted.current || latestUrl.current !== url) return
      setState(
        outcome.status === 'session'
          ? { status: 'ready', session: outcome.session, type: outcome.type }
          : { status: 'error', message: outcome.message },
      )
    })
  }, [url])

  useEffect(() => {
    if (url) return
    const timer = setTimeout(() => {
      setState((current) => (current.status === 'checking' ? { status: 'error', message: NO_LINK_MESSAGE } : current))
    }, graceMs)
    return () => clearTimeout(timer)
  }, [url, graceMs])

  return state
}
