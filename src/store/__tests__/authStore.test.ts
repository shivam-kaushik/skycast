import type { Session, User } from '@supabase/supabase-js'
import { useAuthStore } from '@/src/store/authStore'

const mockUser = { id: 'user-1', email: 'person@example.com' } as User
const mockSession = { access_token: 'tok', user: mockUser } as Session

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, session: null, isLoading: false })
  })

  it('starts signed out with no user or session', () => {
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().session).toBeNull()
  })

  it('setSession stores the session and derives the user from it', () => {
    useAuthStore.getState().setSession(mockSession)
    expect(useAuthStore.getState().session).toBe(mockSession)
    expect(useAuthStore.getState().user).toBe(mockUser)
  })

  it('setSession(null) clears both session and user', () => {
    useAuthStore.getState().setSession(mockSession)
    useAuthStore.getState().setSession(null)
    expect(useAuthStore.getState().session).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('setUser sets the user independently of session', () => {
    useAuthStore.getState().setUser(mockUser)
    expect(useAuthStore.getState().user).toBe(mockUser)
  })

  it('setLoading toggles isLoading', () => {
    useAuthStore.getState().setLoading(true)
    expect(useAuthStore.getState().isLoading).toBe(true)
    useAuthStore.getState().setLoading(false)
    expect(useAuthStore.getState().isLoading).toBe(false)
  })
})
