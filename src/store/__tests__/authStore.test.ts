import type { AuthUser } from '@/src/api/auth'
import { useAuthStore } from '@/src/store/authStore'

const mockUser: AuthUser = { id: 'uid-1', email: 'a@b.co', displayName: null, emailVerified: false }

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isLoading: false })
  })

  it('starts signed out', () => {
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('setUser stores and clears the user', () => {
    useAuthStore.getState().setUser(mockUser)
    expect(useAuthStore.getState().user).toBe(mockUser)

    useAuthStore.getState().setUser(null)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('setLoading toggles the loading flag', () => {
    useAuthStore.getState().setLoading(true)
    expect(useAuthStore.getState().isLoading).toBe(true)
    useAuthStore.getState().setLoading(false)
    expect(useAuthStore.getState().isLoading).toBe(false)
  })
})
