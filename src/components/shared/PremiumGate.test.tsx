import React from 'react'
import renderer, { act } from 'react-test-renderer'
import PremiumGate from './PremiumGate'
import { usePremiumStore } from '@/src/store/premiumStore'

afterEach(() => {
  usePremiumStore.setState({ isPremium: false, isPaywallVisible: false })
})

describe('PremiumGate', () => {
  it('shows lock gate when not premium', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(
        <PremiumGate featureName="AI Chat">
          <></>
        </PremiumGate>,
      )
    })
    const json = JSON.stringify(tree.toJSON())
    expect(json).toMatch(/AI Chat/)
    expect(json).toMatch(/Unlock with Premium/)
  })

  it('renders children when premium', async () => {
    await act(async () => {
      usePremiumStore.setState({ isPremium: true })
    })
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(
        <PremiumGate featureName="AI Chat">
          <></>
        </PremiumGate>,
      )
    })
    const json = JSON.stringify(tree.toJSON())
    expect(json).not.toMatch(/Unlock with Premium/)
  })
})
