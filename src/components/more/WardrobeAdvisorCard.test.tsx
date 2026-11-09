import React from 'react'
import renderer, { act } from 'react-test-renderer'
import WardrobeAdvisorCard from './WardrobeAdvisorCard'
import { buildWeatherContext, type WardrobeAdvice } from '@/src/api/openai'
import { deferred, weatherContext } from '@/src/utils/testFixtures'
import { hasText, pressText } from '@/src/utils/testScreenHelpers'

// First render is slow under parallel workers; 5s is too tight.
jest.setTimeout(30_000)

jest.mock('@/src/api/openai', () => ({
  ...jest.requireActual('@/src/api/openai'),
  getWardrobeAdvice: jest.fn(),
}))

jest.mock('@/src/store/premiumStore', () => {
  const state = { canQuery: jest.fn(), incrementQuery: jest.fn(), showPaywall: jest.fn() }
  return { usePremiumStore: () => state, __state: state }
})

const { getWardrobeAdvice } = jest.requireMock('@/src/api/openai') as { getWardrobeAdvice: jest.Mock }
const { __state: premium } = jest.requireMock('@/src/store/premiumStore') as {
  __state: { canQuery: jest.Mock; incrementQuery: jest.Mock; showPaywall: jest.Mock }
}

const CTX = weatherContext({ persona: 'wellness' })
const ADVICE: WardrobeAdvice = {
  top: 'Light rain jacket',
  bottom: 'Quick-dry trousers',
  footwear: 'Waterproof boots',
  accessories: ['Umbrella', 'Cap'],
  notes: 'Showers clear by evening.',
}
let trees: renderer.ReactTestRenderer[] = []

async function render(): Promise<renderer.ReactTestRenderer> {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(<WardrobeAdvisorCard weatherCtx={CTX} />)
  })
  trees.push(tree)
  return tree
}

beforeEach(() => {
  getWardrobeAdvice.mockReset()
  premium.canQuery.mockReset().mockReturnValue(true)
  premium.incrementQuery.mockReset().mockResolvedValue(undefined)
  premium.showPaywall.mockReset()
})

afterEach(() => {
  act(() => {
    trees.forEach((t) => t.unmount())
  })
  trees = []
})

describe('WardrobeAdvisorCard', () => {
  it('renders the ask button in its initial state', async () => {
    const tree = await render()

    expect(hasText(tree, 'Wardrobe Advisor')).toBe(true)
    expect(hasText(tree, 'What should I wear today?')).toBe(true)
    expect(getWardrobeAdvice).not.toHaveBeenCalled()
  })

  it('asks for advice using the weather context and counts the query', async () => {
    getWardrobeAdvice.mockResolvedValue(ADVICE)
    const tree = await render()

    await pressText(tree, 'What should I wear today?')

    expect(getWardrobeAdvice).toHaveBeenCalledWith(buildWeatherContext(CTX))
    expect(premium.incrementQuery).toHaveBeenCalledTimes(1)
  })

  it('shows a loading state, hiding the ask button, while the advice is fetched', async () => {
    const pending = deferred<WardrobeAdvice>()
    getWardrobeAdvice.mockReturnValue(pending.promise)
    const tree = await render()

    await pressText(tree, 'What should I wear today?', { wait: false })

    expect(hasText(tree, 'Checking the forecast…')).toBe(true)
    expect(hasText(tree, 'What should I wear today?')).toBe(false)

    await act(async () => {
      pending.resolve(ADVICE)
    })
    expect(hasText(tree, 'Checking the forecast…')).toBe(false)
  })

  it('shows each outfit item, joined accessories and the notes', async () => {
    getWardrobeAdvice.mockResolvedValue(ADVICE)
    const tree = await render()

    await pressText(tree, 'What should I wear today?')

    for (const text of ['Top', 'Bottom', 'Footwear', 'Accessories']) expect(hasText(tree, text)).toBe(true)
    expect(hasText(tree, 'Light rain jacket')).toBe(true)
    expect(hasText(tree, 'Quick-dry trousers')).toBe(true)
    expect(hasText(tree, 'Waterproof boots')).toBe(true)
    expect(hasText(tree, 'Umbrella, Cap')).toBe(true)
    expect(hasText(tree, 'Showers clear by evening.')).toBe(true)
    expect(hasText(tree, 'Refresh')).toBe(true)
    expect(hasText(tree, 'What should I wear today?')).toBe(false)
  })

  it('omits the accessories and notes rows when the model returns none', async () => {
    getWardrobeAdvice.mockResolvedValue({ ...ADVICE, accessories: [], notes: '' })
    const tree = await render()

    await pressText(tree, 'What should I wear today?')

    expect(hasText(tree, 'Accessories')).toBe(false)
    expect(hasText(tree, 'Showers clear by evening.')).toBe(false)
    expect(hasText(tree, 'Top')).toBe(true)
  })

  it('shows an error and offers the button again when the request fails', async () => {
    getWardrobeAdvice.mockRejectedValue(new Error('quota'))
    const tree = await render()

    await pressText(tree, 'What should I wear today?')

    expect(hasText(tree, 'Could not get wardrobe advice. Try again.')).toBe(true)
    expect(hasText(tree, 'What should I wear today?')).toBe(true)
    expect(hasText(tree, 'Checking the forecast…')).toBe(false)
  })

  it('clears a previous error when retrying successfully', async () => {
    getWardrobeAdvice.mockRejectedValueOnce(new Error('quota')).mockResolvedValueOnce(ADVICE)
    const tree = await render()

    await pressText(tree, 'What should I wear today?')
    await pressText(tree, 'What should I wear today?')

    expect(hasText(tree, 'Could not get wardrobe advice. Try again.')).toBe(false)
    expect(hasText(tree, 'Light rain jacket')).toBe(true)
  })

  it('refreshes: asks again and replaces the advice', async () => {
    getWardrobeAdvice.mockResolvedValueOnce(ADVICE).mockResolvedValueOnce({ ...ADVICE, top: 'Sun hat and tee' })
    const tree = await render()
    await pressText(tree, 'What should I wear today?')

    await pressText(tree, 'Refresh')

    expect(getWardrobeAdvice).toHaveBeenCalledTimes(2)
    expect(premium.incrementQuery).toHaveBeenCalledTimes(2)
    expect(hasText(tree, 'Sun hat and tee')).toBe(true)
    expect(hasText(tree, 'Light rain jacket')).toBe(false)
  })

  it('shows the paywall instead of asking when the daily limit is reached', async () => {
    premium.canQuery.mockReturnValue(false)
    const tree = await render()

    await pressText(tree, 'What should I wear today?')

    expect(premium.showPaywall).toHaveBeenCalledTimes(1)
    expect(getWardrobeAdvice).not.toHaveBeenCalled()
    expect(premium.incrementQuery).not.toHaveBeenCalled()
    expect(hasText(tree, 'What should I wear today?')).toBe(true)
  })
})
