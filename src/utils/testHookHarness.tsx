import React from 'react'
import renderer, { act } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export interface HookResult<T> {
  current: T
  /** Unmount the host component (e.g. to exercise effect cleanup). */
  unmount: () => void
}

const mountedRenderers: renderer.ReactTestRenderer[] = []
const createdClients: QueryClient[] = []

// Unmount + clear query caches after every test so react-query's gc/refetch timers
// never keep the Jest process alive (registered once per test file that imports this module).
afterEach(() => {
  act(() => {
    while (mountedRenderers.length > 0) mountedRenderers.pop()?.unmount()
  })
  while (createdClients.length > 0) createdClients.pop()?.clear()
})

/** Render a plain (non-query) hook via a throwaway host component and capture its return value. */
export function renderHook<T>(hook: () => T): HookResult<T> {
  const result = {} as HookResult<T>
  function Harness() {
    result.current = hook()
    return null
  }
  act(() => {
    const tree = renderer.create(<Harness />)
    mountedRenderers.push(tree)
    result.unmount = () => act(() => tree.unmount())
  })
  return result
}

/**
 * Render a React Query–backed hook inside a real QueryClientProvider.
 * Hooks in this app set their own `retry`, which overrides client defaults, so retries
 * are made near-instant via `retryDelay` (hooks don't set it) instead of waiting on backoff.
 */
export function renderHookWithQueryClient<T>(hook: () => T): {
  result: HookResult<T>
  queryClient: QueryClient
} {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 1 } },
  })
  createdClients.push(queryClient)
  const result = {} as HookResult<T>
  function Harness() {
    result.current = hook()
    return null
  }
  act(() => {
    const tree = renderer.create(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>,
    )
    mountedRenderers.push(tree)
    result.unmount = () => act(() => tree.unmount())
  })
  return { result, queryClient }
}

/** Poll `predicate`, flushing microtasks/timers between checks, until it's true or the timeout fires. */
export async function waitFor(
  predicate: () => boolean,
  { timeout = 2000, interval = 10 }: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeout) {
      throw new Error('waitFor: timed out waiting for condition')
    }
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, interval))
    })
  }
}
