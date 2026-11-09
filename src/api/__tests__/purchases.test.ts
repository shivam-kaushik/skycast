type PurchasesApi = typeof import('@/src/api/purchases')

const RC_ENV_KEYS = ['EXPO_PUBLIC_RC_API_KEY', 'EXPO_PUBLIC_RC_API_KEY_IOS', 'EXPO_PUBLIC_RC_API_KEY_ANDROID'] as const

const sdk = {
  configure: jest.fn(),
  getCustomerInfo: jest.fn(),
  getOfferings: jest.fn(),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  logIn: jest.fn(),
  logOut: jest.fn(),
}

const PREMIUM = { entitlements: { active: { premium: { isActive: true } } } }
const FREE = { entitlements: { active: {} } }

interface LoadOptions {
  os?: 'ios' | 'android'
  env?: Partial<Record<(typeof RC_ENV_KEYS)[number], string>>
  /** When true, importing the RevenueCat SDK throws (e.g. native module missing in Expo Go). */
  sdkMissing?: boolean
}

/**
 * Load a fresh copy of the module: it reads env + Platform at import and caches the SDK once resolved.
 * Uses resetModules (not isolateModules) because the SDK is imported lazily, after loading returns —
 * the mocks must still be registered in the active registry when that dynamic import runs.
 */
function loadPurchases({ os = 'ios', env = {}, sdkMissing = false }: LoadOptions = {}): PurchasesApi {
  for (const key of RC_ENV_KEYS) delete process.env[key]
  Object.assign(process.env, env)

  jest.resetModules()
  jest.doMock('react-native', () => ({ Platform: { OS: os } }))
  jest.doMock('react-native-purchases', () => {
    if (sdkMissing) throw new Error('native module unavailable')
    return { __esModule: true, default: sdk }
  })
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/src/api/purchases') as PurchasesApi
}

beforeEach(() => {
  for (const fn of Object.values(sdk)) fn.mockReset()
})

afterAll(() => {
  for (const key of RC_ENV_KEYS) delete process.env[key]
})

describe('initPurchases', () => {
  it('configures the SDK with the iOS key on iOS', async () => {
    const api = loadPurchases({ os: 'ios', env: { EXPO_PUBLIC_RC_API_KEY_IOS: 'ios-key', EXPO_PUBLIC_RC_API_KEY_ANDROID: 'and-key' } })
    await api.initPurchases()
    expect(sdk.configure).toHaveBeenCalledWith({ apiKey: 'ios-key' })
  })

  it('configures the SDK with the Android key on Android', async () => {
    const api = loadPurchases({ os: 'android', env: { EXPO_PUBLIC_RC_API_KEY_IOS: 'ios-key', EXPO_PUBLIC_RC_API_KEY_ANDROID: 'and-key' } })
    await api.initPurchases()
    expect(sdk.configure).toHaveBeenCalledWith({ apiKey: 'and-key' })
  })

  it('falls back to the shared key when no platform key is set', async () => {
    const api = loadPurchases({ os: 'android', env: { EXPO_PUBLIC_RC_API_KEY: 'shared' } })
    await api.initPurchases()
    expect(sdk.configure).toHaveBeenCalledWith({ apiKey: 'shared' })
  })

  it('prefers a platform key over the shared key', async () => {
    const api = loadPurchases({ os: 'ios', env: { EXPO_PUBLIC_RC_API_KEY: 'shared', EXPO_PUBLIC_RC_API_KEY_IOS: 'ios-key' } })
    await api.initPurchases()
    expect(sdk.configure).toHaveBeenCalledWith({ apiKey: 'ios-key' })
  })

  it('does nothing when no key is configured', async () => {
    await loadPurchases().initPurchases()
    expect(sdk.configure).not.toHaveBeenCalled()
  })

  it('does nothing when the SDK cannot be loaded', async () => {
    const api = loadPurchases({ env: { EXPO_PUBLIC_RC_API_KEY: 'shared' }, sdkMissing: true })
    await expect(api.initPurchases()).resolves.toBeUndefined()
    expect(sdk.configure).not.toHaveBeenCalled()
  })
})

describe('checkPremiumStatus', () => {
  it('is true when the premium entitlement is active', async () => {
    sdk.getCustomerInfo.mockResolvedValue(PREMIUM)
    await expect(loadPurchases().checkPremiumStatus()).resolves.toBe(true)
  })

  it('is false without the premium entitlement', async () => {
    sdk.getCustomerInfo.mockResolvedValue(FREE)
    await expect(loadPurchases().checkPremiumStatus()).resolves.toBe(false)
  })

  it('is false when the SDK call fails', async () => {
    sdk.getCustomerInfo.mockRejectedValue(new Error('offline'))
    await expect(loadPurchases().checkPremiumStatus()).resolves.toBe(false)
  })

  it('is false when the SDK cannot be loaded', async () => {
    await expect(loadPurchases({ sdkMissing: true }).checkPremiumStatus()).resolves.toBe(false)
  })
})

describe('purchasePremium', () => {
  it('buys the current monthly package and reports premium on success', async () => {
    const monthly = { identifier: 'monthly' }
    sdk.getOfferings.mockResolvedValue({ current: { monthly } })
    sdk.purchasePackage.mockResolvedValue({ customerInfo: PREMIUM })

    await expect(loadPurchases().purchasePremium()).resolves.toBe(true)
    expect(sdk.purchasePackage).toHaveBeenCalledWith(monthly)
  })

  it('is false when the purchase does not grant the entitlement', async () => {
    sdk.getOfferings.mockResolvedValue({ current: { monthly: {} } })
    sdk.purchasePackage.mockResolvedValue({ customerInfo: FREE })

    await expect(loadPurchases().purchasePremium()).resolves.toBe(false)
  })

  it.each([[{ current: null }], [{ current: {} }]])('is false, without buying, when there is no monthly offering (%j)', async (offerings) => {
    sdk.getOfferings.mockResolvedValue(offerings)

    await expect(loadPurchases().purchasePremium()).resolves.toBe(false)
    expect(sdk.purchasePackage).not.toHaveBeenCalled()
  })

  it('is false when the user cancels the purchase', async () => {
    sdk.getOfferings.mockResolvedValue({ current: { monthly: {} } })
    sdk.purchasePackage.mockRejectedValue({ userCancelled: true })

    await expect(loadPurchases().purchasePremium()).resolves.toBe(false)
  })

  it('rethrows other purchase errors', async () => {
    sdk.getOfferings.mockResolvedValue({ current: { monthly: {} } })
    sdk.purchasePackage.mockRejectedValue(new Error('payment declined'))

    await expect(loadPurchases().purchasePremium()).rejects.toThrow('payment declined')
  })

  it('is false when the SDK cannot be loaded', async () => {
    await expect(loadPurchases({ sdkMissing: true }).purchasePremium()).resolves.toBe(false)
  })
})

describe('restorePurchases', () => {
  it('reports premium when the restored customer has the entitlement', async () => {
    sdk.restorePurchases.mockResolvedValue(PREMIUM)
    await expect(loadPurchases().restorePurchases()).resolves.toBe(true)
  })

  it('is false when nothing premium is restored', async () => {
    sdk.restorePurchases.mockResolvedValue(FREE)
    await expect(loadPurchases().restorePurchases()).resolves.toBe(false)
  })

  it('is false when restoring fails or the SDK is unavailable', async () => {
    sdk.restorePurchases.mockRejectedValue(new Error('store unavailable'))
    await expect(loadPurchases().restorePurchases()).resolves.toBe(false)
    await expect(loadPurchases({ sdkMissing: true }).restorePurchases()).resolves.toBe(false)
  })
})

describe('loginUser', () => {
  it('links RevenueCat to the user id and returns their premium status', async () => {
    sdk.logIn.mockResolvedValue({ customerInfo: PREMIUM })

    await expect(loadPurchases().loginUser('user-1')).resolves.toBe(true)
    expect(sdk.logIn).toHaveBeenCalledWith('user-1')
  })

  it('returns false for a user without the entitlement', async () => {
    sdk.logIn.mockResolvedValue({ customerInfo: FREE })
    await expect(loadPurchases().loginUser('user-1')).resolves.toBe(false)
  })

  it('returns false when login fails or the SDK is unavailable', async () => {
    sdk.logIn.mockRejectedValue(new Error('bad id'))
    await expect(loadPurchases().loginUser('user-1')).resolves.toBe(false)
    await expect(loadPurchases({ sdkMissing: true }).loginUser('user-1')).resolves.toBe(false)
  })
})

describe('logoutUser', () => {
  it('reverts to the anonymous identity', async () => {
    sdk.logOut.mockResolvedValue(undefined)
    await loadPurchases().logoutUser()
    expect(sdk.logOut).toHaveBeenCalledTimes(1)
  })

  it('swallows SDK errors and a missing SDK', async () => {
    sdk.logOut.mockRejectedValue(new Error('already anonymous'))
    await expect(loadPurchases().logoutUser()).resolves.toBeUndefined()
    await expect(loadPurchases({ sdkMissing: true }).logoutUser()).resolves.toBeUndefined()
  })
})
