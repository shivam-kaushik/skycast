import React from 'react'
import { Modal } from 'react-native'
import renderer, { act } from 'react-test-renderer'
import PaywallModal from './PaywallModal'
import { deferred } from '@/src/utils/testFixtures'
import { hasText, pressText } from '@/src/utils/testScreenHelpers'

// First render is slow under parallel workers; 5s is too tight.
jest.setTimeout(30_000)

jest.mock('@/src/store/premiumStore', () => {
  const state = {
    isPaywallVisible: false,
    hidePaywall: jest.fn(),
    setPremium: jest.fn(),
    loadQueryCount: jest.fn(),
  }
  return { usePremiumStore: () => state, __state: state }
})

jest.mock('@/src/api/purchases', () => ({
  purchasePremium: jest.fn(),
  restorePurchases: jest.fn(),
}))

const { __state: premium } = jest.requireMock('@/src/store/premiumStore') as {
  __state: { isPaywallVisible: boolean; hidePaywall: jest.Mock; setPremium: jest.Mock; loadQueryCount: jest.Mock }
}
const { purchasePremium, restorePurchases } = jest.requireMock('@/src/api/purchases') as {
  purchasePremium: jest.Mock
  restorePurchases: jest.Mock
}

let trees: renderer.ReactTestRenderer[] = []

async function render(): Promise<renderer.ReactTestRenderer> {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(<PaywallModal />)
  })
  trees.push(tree)
  return tree
}

beforeEach(() => {
  premium.isPaywallVisible = true
  premium.hidePaywall.mockReset()
  premium.setPremium.mockReset()
  premium.loadQueryCount.mockReset().mockResolvedValue(undefined)
  purchasePremium.mockReset()
  restorePurchases.mockReset()
})

afterEach(() => {
  act(() => {
    trees.forEach((t) => t.unmount())
  })
  trees = []
})

describe('PaywallModal — content', () => {
  it('does not render the offer when not visible', async () => {
    premium.isPaywallVisible = false
    const tree = await render()

    expect(hasText(tree, 'Start Free Trial')).toBe(false)
  })

  it('shows the headline, pricing, features and legal copy', async () => {
    const tree = await render()

    expect(hasText(tree, 'Skycast Premium')).toBe(true)
    expect(hasText(tree, '$2.99 / month')).toBe(true)
    expect(hasText(tree, 'or $19.99 / year · 7-day free trial')).toBe(true)
    expect(hasText(tree, 'Start Free Trial')).toBe(true)
    expect(hasText(tree, 'Restore Purchases')).toBe(true)
    expect(hasText(tree, 'AI Chat Assistant — ask anything about your weather')).toBe(true)
    expect(hasText(tree, 'AI Wardrobe Advisor — know exactly what to wear')).toBe(true)
    expect(hasText(tree, 'Trip Weather Briefing — plan any journey intelligently')).toBe(true)
    expect(hasText(tree, 'Priority refresh every 5 minutes')).toBe(true)
    expect(hasText(tree, 'Payment charged to your App Store / Play Store account. Cancel anytime in your account settings.')).toBe(true)
  })

  it('closes from the close button and from the system back gesture', async () => {
    const tree = await render()

    act(() => {
      tree.root.findAll((n) => n.props.onPress === premium.hidePaywall)[0]?.props.onPress()
    })
    expect(premium.hidePaywall).toHaveBeenCalledTimes(1)

    act(() => {
      tree.root.findByType(Modal).props.onRequestClose()
    })
    expect(premium.hidePaywall).toHaveBeenCalledTimes(2)
  })
})

describe('PaywallModal — subscribing', () => {
  it('unlocks premium, loads the query count and closes on a successful purchase', async () => {
    purchasePremium.mockResolvedValue(true)
    const tree = await render()

    await pressText(tree, 'Start Free Trial')

    expect(premium.setPremium).toHaveBeenCalledWith(true)
    expect(premium.loadQueryCount).toHaveBeenCalledTimes(1)
    expect(premium.hidePaywall).toHaveBeenCalledTimes(1)
    expect(hasText(tree, 'Purchase cancelled.')).toBe(false)
  })

  it('reports a cancelled purchase and stays open', async () => {
    purchasePremium.mockResolvedValue(false)
    const tree = await render()

    await pressText(tree, 'Start Free Trial')

    expect(hasText(tree, 'Purchase cancelled.')).toBe(true)
    expect(premium.setPremium).not.toHaveBeenCalled()
    expect(premium.hidePaywall).not.toHaveBeenCalled()
  })

  it('reports a failed purchase and stays open', async () => {
    purchasePremium.mockRejectedValue(new Error('payment declined'))
    const tree = await render()

    await pressText(tree, 'Start Free Trial')

    expect(hasText(tree, 'Something went wrong. Please try again.')).toBe(true)
    expect(premium.setPremium).not.toHaveBeenCalled()
    expect(premium.hidePaywall).not.toHaveBeenCalled()
  })

  it('shows a busy, disabled button while the purchase is in flight', async () => {
    const pending = deferred<boolean>()
    purchasePremium.mockReturnValue(pending.promise)
    const tree = await render()

    await pressText(tree, 'Start Free Trial', { wait: false })

    expect(hasText(tree, 'Start Free Trial')).toBe(false)
    expect(tree.root.findAll((n) => typeof n.props.onPress === 'function' && n.props.disabled === true).length).toBeGreaterThan(0)

    await act(async () => {
      pending.resolve(false)
    })
    expect(hasText(tree, 'Start Free Trial')).toBe(true)
  })

  it('clears a previous error when the user tries again', async () => {
    purchasePremium.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    const tree = await render()

    await pressText(tree, 'Start Free Trial')
    expect(hasText(tree, 'Purchase cancelled.')).toBe(true)

    await pressText(tree, 'Start Free Trial')
    expect(hasText(tree, 'Purchase cancelled.')).toBe(false)
    expect(premium.hidePaywall).toHaveBeenCalledTimes(1)
  })
})

describe('PaywallModal — restoring', () => {
  it('unlocks premium and closes when a previous purchase is restored', async () => {
    restorePurchases.mockResolvedValue(true)
    const tree = await render()

    await pressText(tree, 'Restore Purchases')

    expect(premium.setPremium).toHaveBeenCalledWith(true)
    expect(premium.loadQueryCount).toHaveBeenCalledTimes(1)
    expect(premium.hidePaywall).toHaveBeenCalledTimes(1)
  })

  it('tells the user when there is nothing to restore', async () => {
    restorePurchases.mockResolvedValue(false)
    const tree = await render()

    await pressText(tree, 'Restore Purchases')

    expect(hasText(tree, 'No previous purchases found.')).toBe(true)
    expect(premium.hidePaywall).not.toHaveBeenCalled()
  })

  it('reports a failed restore', async () => {
    restorePurchases.mockRejectedValue(new Error('store unavailable'))
    const tree = await render()

    await pressText(tree, 'Restore Purchases')

    expect(hasText(tree, 'Restore failed. Please try again.')).toBe(true)
    expect(premium.setPremium).not.toHaveBeenCalled()
  })

  it('shows a restoring label while in flight', async () => {
    const pending = deferred<boolean>()
    restorePurchases.mockReturnValue(pending.promise)
    const tree = await render()

    await pressText(tree, 'Restore Purchases', { wait: false })

    expect(hasText(tree, 'Restoring…')).toBe(true)
    expect(hasText(tree, 'Restore Purchases')).toBe(false)

    await act(async () => {
      pending.resolve(false)
    })
    expect(hasText(tree, 'Restore Purchases')).toBe(true)
  })
})
