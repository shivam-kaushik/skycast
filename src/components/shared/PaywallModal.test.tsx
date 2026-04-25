import React from 'react'
import renderer, { act } from 'react-test-renderer'
import PaywallModal from './PaywallModal'
import { usePremiumStore } from '@/src/store/premiumStore'

afterEach(() => {
  usePremiumStore.setState({ isPremium: false, isPaywallVisible: false })
})

describe('PaywallModal', () => {
  it('renders paywall content when visible', async () => {
    await act(async () => {
      usePremiumStore.setState({ isPaywallVisible: true })
    })
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<PaywallModal />)
    })
    const json = JSON.stringify(tree.toJSON())
    expect(json).toMatch(/Skycast Premium/)
    expect(json).toMatch(/Start Free Trial/)
    expect(json).toMatch(/\$2\.99/)
  })

  it('does not render content when not visible', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<PaywallModal />)
    })
    const json = JSON.stringify(tree.toJSON())
    expect(json).not.toMatch(/Start Free Trial/)
  })
})
