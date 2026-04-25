import { usePremiumStore, MAX_DAILY_QUERIES } from '../premiumStore'

beforeEach(() => {
  usePremiumStore.setState({
    isPremium: false,
    isDevUnlocked: false,
    queriesUsedToday: 0,
    queryDate: new Date().toISOString().slice(0, 10),
    isPaywallVisible: false,
    isHydrated: false,
  })
})

describe('premiumStore', () => {
  it('starts as non-premium with paywall hidden', () => {
    const s = usePremiumStore.getState()
    expect(s.isPremium).toBe(false)
    expect(s.isPaywallVisible).toBe(false)
  })

  it('setPremium marks user as premium and persists', async () => {
    await usePremiumStore.getState().setPremium(true)
    expect(usePremiumStore.getState().isPremium).toBe(true)
  })

  it('showPaywall / hidePaywall toggle visibility', () => {
    usePremiumStore.getState().showPaywall()
    expect(usePremiumStore.getState().isPaywallVisible).toBe(true)
    usePremiumStore.getState().hidePaywall()
    expect(usePremiumStore.getState().isPaywallVisible).toBe(false)
  })

  it('canQuery returns false when not premium and not dev unlocked', () => {
    usePremiumStore.setState({ isPremium: false, isDevUnlocked: false })
    expect(usePremiumStore.getState().canQuery()).toBe(false)
  })

  it('canQuery returns true when premium and under daily limit', () => {
    usePremiumStore.setState({ isPremium: true, queriesUsedToday: 5 })
    expect(usePremiumStore.getState().canQuery()).toBe(true)
  })

  it('canQuery returns true when dev unlocked even without premium', () => {
    usePremiumStore.setState({ isPremium: false, isDevUnlocked: true, queriesUsedToday: 0 })
    expect(usePremiumStore.getState().canQuery()).toBe(true)
  })

  it('canQuery returns false when at daily limit', () => {
    usePremiumStore.setState({ isPremium: true, queriesUsedToday: MAX_DAILY_QUERIES })
    expect(usePremiumStore.getState().canQuery()).toBe(false)
  })

  it('incrementQuery increases count', async () => {
    usePremiumStore.setState({ isPremium: true, queriesUsedToday: 3 })
    await usePremiumStore.getState().incrementQuery()
    expect(usePremiumStore.getState().queriesUsedToday).toBe(4)
  })

  it('incrementQuery resets count on new day', async () => {
    usePremiumStore.setState({ isPremium: true, queriesUsedToday: 15, queryDate: '2020-01-01' })
    await usePremiumStore.getState().incrementQuery()
    expect(usePremiumStore.getState().queriesUsedToday).toBe(1)
  })

  it('toggleDevUnlock flips dev mode and persists', async () => {
    await usePremiumStore.getState().toggleDevUnlock()
    expect(usePremiumStore.getState().isDevUnlocked).toBe(true)
    await usePremiumStore.getState().toggleDevUnlock()
    expect(usePremiumStore.getState().isDevUnlocked).toBe(false)
  })
})
