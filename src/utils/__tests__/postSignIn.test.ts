import { syncPurchasesForUser } from '@/src/utils/postSignIn'

jest.mock('@/src/api/purchases', () => ({ loginUser: jest.fn() }))

jest.mock('@/src/store/premiumStore', () => {
  const state = { setPremium: jest.fn(), loadQueryCount: jest.fn() }
  return { usePremiumStore: { getState: () => state }, __state: state }
})

const { loginUser } = jest.requireMock('@/src/api/purchases') as { loginUser: jest.Mock }
const { __state: premium } = jest.requireMock('@/src/store/premiumStore') as {
  __state: { setPremium: jest.Mock; loadQueryCount: jest.Mock }
}

describe('syncPurchasesForUser', () => {
  beforeEach(() => {
    loginUser.mockReset()
    premium.setPremium.mockReset().mockResolvedValue(undefined)
    premium.loadQueryCount.mockReset().mockResolvedValue(undefined)
  })

  it('links RevenueCat to the user and stores their premium status', async () => {
    loginUser.mockResolvedValue(true)

    await syncPurchasesForUser('user-1')

    expect(loginUser).toHaveBeenCalledWith('user-1')
    expect(premium.setPremium).toHaveBeenCalledWith(true)
  })

  it('loads the AI query count for premium users', async () => {
    loginUser.mockResolvedValue(true)

    await syncPurchasesForUser('user-1')

    expect(premium.loadQueryCount).toHaveBeenCalledTimes(1)
  })

  it('skips the query count for non-premium users', async () => {
    loginUser.mockResolvedValue(false)

    await syncPurchasesForUser('user-1')

    expect(premium.setPremium).toHaveBeenCalledWith(false)
    expect(premium.loadQueryCount).not.toHaveBeenCalled()
  })

  it('stores the premium status before loading the query count', async () => {
    loginUser.mockResolvedValue(true)

    await syncPurchasesForUser('user-1')

    expect(premium.setPremium.mock.invocationCallOrder[0]).toBeLessThan(premium.loadQueryCount.mock.invocationCallOrder[0] ?? 0)
  })
})
