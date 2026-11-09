import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ marker: 'client' })),
}))

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}))

interface AuthStorage {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
}

interface ClientOptions {
  auth: AuthStorageOptions
}
interface AuthStorageOptions {
  storage: AuthStorage
  autoRefreshToken: boolean
  persistSession: boolean
  detectSessionInUrl: boolean
}

const mockCreateClient = createClient as jest.Mock
const secure = SecureStore as jest.Mocked<typeof SecureStore>

/** In-memory stand-in for the device keychain. */
const keychain = new Map<string, string>()

function loadModule(env: { url?: string; key?: string } = {}): { supabase: unknown; options: ClientOptions } {
  process.env.EXPO_PUBLIC_SUPABASE_URL = env.url
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = env.key
  if (env.url === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL
  if (env.key === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

  let supabase: unknown
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    supabase = (require('@/src/api/supabase') as { supabase: unknown }).supabase
  })
  const options = mockCreateClient.mock.calls[mockCreateClient.mock.calls.length - 1]?.[2] as ClientOptions
  return { supabase, options }
}

function storage(): AuthStorage {
  return loadModule().options.auth.storage
}

/** Chunk keys stored for `key`, in index order. */
function chunkKeys(key: string): string[] {
  return [...keychain.keys()].filter((k) => k.startsWith(`${key}.`)).sort()
}

beforeEach(() => {
  keychain.clear()
  mockCreateClient.mockClear()
  secure.getItemAsync.mockReset().mockImplementation(async (k: string) => keychain.get(k) ?? null)
  secure.setItemAsync.mockReset().mockImplementation(async (k: string, v: string) => {
    keychain.set(k, v)
  })
  secure.deleteItemAsync.mockReset().mockImplementation(async (k: string) => {
    keychain.delete(k)
  })
})

afterAll(() => {
  delete process.env.EXPO_PUBLIC_SUPABASE_URL
  delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
})

describe('supabase client', () => {
  it('is created from the public env vars with session persistence enabled', () => {
    const { supabase } = loadModule({ url: 'https://proj.supabase.co', key: 'anon-key' })

    expect(supabase).toEqual({ marker: 'client' })
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://proj.supabase.co',
      'anon-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        }),
      }),
    )
  })

  it('falls back to empty strings when the env vars are missing', () => {
    loadModule()
    expect(mockCreateClient.mock.calls[0]?.slice(0, 2)).toEqual(['', ''])
  })
})

describe('secure-store session adapter', () => {
  it('returns null when nothing is stored', async () => {
    await expect(storage().getItem('sb-session')).resolves.toBeNull()
  })

  it('stores a small value in a single chunk and reads it back', async () => {
    const adapter = storage()
    await adapter.setItem('sb-session', 'short')

    expect(chunkKeys('sb-session')).toEqual(['sb-session.0'])
    await expect(adapter.getItem('sb-session')).resolves.toBe('short')
  })

  it('splits values larger than the 2048-byte SecureStore limit into <=1800 char chunks', async () => {
    const adapter = storage()
    const value = 'x'.repeat(4000)
    await adapter.setItem('sb-session', value)

    expect(chunkKeys('sb-session')).toEqual(['sb-session.0', 'sb-session.1', 'sb-session.2'])
    for (const k of chunkKeys('sb-session')) {
      expect((keychain.get(k) ?? '').length).toBeLessThanOrEqual(1800)
    }
    await expect(adapter.getItem('sb-session')).resolves.toBe(value)
  })

  it('round-trips a realistic session JSON payload', async () => {
    const adapter = storage()
    const session = JSON.stringify({ access_token: 'a'.repeat(1500), refresh_token: 'r'.repeat(300), user: { id: 'u1' } })
    await adapter.setItem('sb-session', session)

    await expect(adapter.getItem('sb-session')).resolves.toBe(session)
  })

  it('removes every chunk of a value', async () => {
    const adapter = storage()
    await adapter.setItem('sb-session', 'x'.repeat(4000))
    await adapter.removeItem('sb-session')

    expect(chunkKeys('sb-session')).toEqual([])
    await expect(adapter.getItem('sb-session')).resolves.toBeNull()
  })

  it('keeps different keys independent', async () => {
    const adapter = storage()
    await adapter.setItem('a', 'x'.repeat(2000))
    await adapter.setItem('b', 'bee')
    await adapter.removeItem('a')

    await expect(adapter.getItem('b')).resolves.toBe('bee')
  })

  it('does not return corrupted data when a session shrinks below fewer chunks (token refresh)', async () => {
    const adapter = storage()
    await adapter.setItem('sb-session', 'x'.repeat(4000)) // 3 chunks
    await adapter.setItem('sb-session', 'y'.repeat(100)) //  1 chunk — stale chunks 1 and 2 must not survive

    await expect(adapter.getItem('sb-session')).resolves.toBe('y'.repeat(100))
  })
})
