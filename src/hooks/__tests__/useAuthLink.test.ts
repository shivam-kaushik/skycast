import { act } from 'react-test-renderer'
import { useAuthLink } from '@/src/hooks/useAuthLink'
import { createSessionFromAuthLink } from '@/src/api/authLinks'
import { deferred } from '@/src/utils/testFixtures'
import { renderHook } from '@/src/utils/testHookHarness'

// A controllable stand-in for expo-linking: `setUrl` re-renders any component using the hook.
jest.mock('expo-linking', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react') as typeof import('react')
  const store = { url: null as string | null, listeners: new Set<() => void>() }
  return {
    useLinkingURL: (): string | null => {
      const [, force] = R.useReducer((n: number) => n + 1, 0)
      R.useEffect(() => {
        store.listeners.add(force)
        return () => {
          store.listeners.delete(force)
        }
      }, [])
      return store.url
    },
    __setUrl: (url: string | null) => {
      store.url = url
      store.listeners.forEach((l) => l())
    },
  }
})

jest.mock('@/src/api/authLinks', () => ({ createSessionFromAuthLink: jest.fn() }))

const { __setUrl: setUrl } = jest.requireMock('expo-linking') as { __setUrl: (url: string | null) => void }
const createSession = createSessionFromAuthLink as jest.MockedFunction<typeof createSessionFromAuthLink>

const LINK = 'skycast://reset-password#access_token=a&refresh_token=r&type=recovery'
const SESSION = { access_token: 'a', user: { id: 'u1' } } as never
const READY = { status: 'session' as const, session: SESSION, type: 'recovery' }

/** Let promise callbacks run and flush the resulting state updates. */
const flush = () => act(async () => {})

beforeEach(() => {
  createSession.mockReset()
  setUrl(null)
  jest.useFakeTimers({
    // Only setTimeout is faked, so act() and promises keep working.
    doNotFake: ['setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'],
  })
})

afterEach(() => {
  jest.useRealTimers()
})

describe('useAuthLink', () => {
  it('is checking while it waits for a link', () => {
    const result = renderHook(() => useAuthLink())

    expect(result.current).toEqual({ status: 'checking' })
    expect(createSession).not.toHaveBeenCalled()
  })

  it('becomes ready with the session and link type once the link is exchanged', async () => {
    createSession.mockResolvedValue(READY)
    const result = renderHook(() => useAuthLink())

    act(() => setUrl(LINK))
    await flush()

    expect(createSession).toHaveBeenCalledWith(LINK)
    expect(result.current).toEqual({ status: 'ready', session: SESSION, type: 'recovery' })
  })

  it('handles a link that was already present when the screen mounted', async () => {
    setUrl(LINK)
    createSession.mockResolvedValue(READY)

    const result = renderHook(() => useAuthLink())
    await flush()

    expect(result.current.status).toBe('ready')
  })

  it('reports an error from a bad or expired link', async () => {
    createSession.mockResolvedValue({ status: 'error', message: 'This link has expired. Please request a new one.' })
    const result = renderHook(() => useAuthLink())

    act(() => setUrl('skycast://reset-password#error=access_denied&error_code=otp_expired'))
    await flush()

    expect(result.current).toEqual({ status: 'error', message: 'This link has expired. Please request a new one.' })
  })

  it('stays in checking while the exchange is in flight', async () => {
    const pending = deferred<typeof READY>()
    createSession.mockReturnValue(pending.promise)
    const result = renderHook(() => useAuthLink())

    act(() => setUrl(LINK))
    await flush()
    expect(result.current).toEqual({ status: 'checking' })

    await act(async () => {
      pending.resolve(READY)
    })
    expect(result.current.status).toBe('ready')
  })

  it('exchanges each link only once, even across re-renders', async () => {
    createSession.mockResolvedValue(READY)
    const result = renderHook(() => useAuthLink())

    act(() => setUrl(LINK))
    await flush()
    act(() => setUrl(LINK))
    await flush()

    expect(createSession).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('ready')
  })
})

describe('useAuthLink — no link', () => {
  it('gives up after the grace period when the screen is opened without a link', () => {
    const result = renderHook(() => useAuthLink(1500))

    act(() => {
      jest.advanceTimersByTime(1499)
    })
    expect(result.current.status).toBe('checking')

    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(result.current).toEqual({
      status: 'error',
      message: 'Open the link from your email on this device to continue.',
    })
  })

  it('does not time out if the link arrives in time', async () => {
    createSession.mockResolvedValue(READY)
    const result = renderHook(() => useAuthLink(1500))

    act(() => {
      jest.advanceTimersByTime(1000)
    })
    act(() => setUrl(LINK))
    await flush()
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(result.current.status).toBe('ready')
  })

  it('recovers if the link shows up after it already gave up', async () => {
    createSession.mockResolvedValue(READY)
    const result = renderHook(() => useAuthLink(1500))
    act(() => {
      jest.advanceTimersByTime(1500)
    })
    expect(result.current.status).toBe('error')

    act(() => setUrl(LINK))
    await flush()

    expect(result.current.status).toBe('ready')
  })
})

describe('useAuthLink — changing links', () => {
  it('ignores a slow earlier result once a newer link has arrived', async () => {
    const slow = deferred<typeof READY>()
    const fast = { status: 'session' as const, session: { user: { id: 'newer' } } as never, type: 'signup' }
    createSession.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(fast)
    const result = renderHook(() => useAuthLink())

    act(() => setUrl('skycast://x#access_token=old&refresh_token=old'))
    await flush()
    act(() => setUrl('skycast://x#access_token=new&refresh_token=new'))
    await flush()
    await act(async () => {
      slow.resolve(READY)
    })

    expect(result.current).toEqual({ status: 'ready', session: fast.session, type: 'signup' })
  })

  it('does not update state after unmounting', async () => {
    const pending = deferred<typeof READY>()
    createSession.mockReturnValue(pending.promise)
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})
    const result = renderHook(() => useAuthLink())
    act(() => setUrl(LINK))
    await flush()

    result.unmount()
    await act(async () => {
      pending.resolve(READY)
    })

    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })
})
