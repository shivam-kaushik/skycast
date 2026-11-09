import React from 'react'
import renderer, { act } from 'react-test-renderer'
import AIChatSheet from './AIChatSheet'
import { buildWeatherContext } from '@/src/api/openai'
import { deferred, weatherContext } from '@/src/utils/testFixtures'
import { hasText, pressText, submitInput, typeInto } from '@/src/utils/testScreenHelpers'

// First render is slow under parallel workers; 5s is too tight.
jest.setTimeout(30_000)

jest.mock('@/src/api/openai', () => ({
  ...jest.requireActual('@/src/api/openai'),
  streamChat: jest.fn(),
}))

jest.mock('@/src/store/premiumStore', () => {
  const state = {
    canQuery: jest.fn(),
    incrementQuery: jest.fn(),
    showPaywall: jest.fn(),
    queriesUsedToday: 0,
  }
  return { usePremiumStore: () => state, MAX_DAILY_QUERIES: 20, __state: state }
})

const { streamChat } = jest.requireMock('@/src/api/openai') as { streamChat: jest.Mock }
const { __state: premium } = jest.requireMock('@/src/store/premiumStore') as {
  __state: { canQuery: jest.Mock; incrementQuery: jest.Mock; showPaywall: jest.Mock; queriesUsedToday: number }
}

const CTX = weatherContext()
const PLACEHOLDER = 'Ask about your weather…'
let trees: renderer.ReactTestRenderer[] = []

async function render(): Promise<renderer.ReactTestRenderer> {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(<AIChatSheet weatherCtx={CTX} />)
  })
  trees.push(tree)
  return tree
}

/** The round send button: the only Pressable with an explicit `disabled` prop. */
function sendButton(tree: renderer.ReactTestRenderer) {
  const [button] = tree.root.findAll((n) => typeof n.props.onPress === 'function' && typeof n.props.disabled === 'boolean')
  if (!button) throw new Error('send button not found')
  return button
}

/** Make streamChat emit `tokens` then finish. */
function streamsTokens(...tokens: string[]): void {
  streamChat.mockImplementation(async (_h: unknown, _c: unknown, _m: unknown, onToken: (t: string) => void) => {
    tokens.forEach(onToken)
  })
}

beforeEach(() => {
  streamChat.mockReset()
  premium.canQuery.mockReset().mockReturnValue(true)
  premium.incrementQuery.mockReset().mockResolvedValue(undefined)
  premium.showPaywall.mockReset()
  premium.queriesUsedToday = 0
})

afterEach(() => {
  act(() => {
    trees.forEach((t) => t.unmount())
  })
  trees = []
})

describe('AIChatSheet — empty state', () => {
  it('renders the title and quick reply chips when there are no messages', async () => {
    const tree = await render()

    expect(hasText(tree, 'AI Weather Assistant')).toBe(true)
    for (const chip of [
      'Should I go for a run today?',
      "What's the UV like this afternoon?",
      'Any storms coming this week?',
      'Best time for outdoor exercise?',
    ]) {
      expect(hasText(tree, chip)).toBe(true)
    }
  })

  it.each([
    [0, false],
    [17, false], // 3 left
    [18, true], // 2 left — 10% of the daily allowance
    [19, true],
    [20, true],
  ])('with %p queries used, shows the "left today" nudge: %p', async (used, shown) => {
    premium.queriesUsedToday = used
    const tree = await render()

    expect(hasText(tree, `${20 - used}/20 left today`)).toBe(shown)
  })
})

describe('AIChatSheet — sending', () => {
  it('sends a tapped chip with the weather context and the chat model', async () => {
    streamsTokens('Yes')
    const tree = await render()

    await pressText(tree, 'Should I go for a run today?')

    expect(streamChat).toHaveBeenCalledWith(
      [{ role: 'user', content: 'Should I go for a run today?' }],
      buildWeatherContext(CTX),
      'gpt-4o-mini',
      expect.any(Function),
    )
    expect(premium.incrementQuery).toHaveBeenCalledTimes(1)
  })

  it('shows the user message and streams the reply token by token', async () => {
    streamsTokens('Take', ' an', ' umbrella')
    const tree = await render()

    await pressText(tree, 'Any storms coming this week?')

    expect(hasText(tree, 'Any storms coming this week?')).toBe(true)
    expect(hasText(tree, 'Take an umbrella')).toBe(true)
    // the chips are replaced by the conversation
    expect(hasText(tree, 'Best time for outdoor exercise?')).toBe(false)
  })

  it('sends typed text on submit and clears the input', async () => {
    streamsTokens('Sunny')
    const tree = await render()
    typeInto(tree, PLACEHOLDER, '  Is it sunny?  ')

    await submitInput(tree, PLACEHOLDER)

    expect(streamChat.mock.calls[0]?.[0]).toEqual([{ role: 'user', content: 'Is it sunny?' }])
    expect(tree.root.findAll((n) => n.props.placeholder === PLACEHOLDER && typeof n.props.onChangeText === 'function')[0]?.props.value).toBe('')
  })

  it('ignores blank input', async () => {
    const tree = await render()
    typeInto(tree, PLACEHOLDER, '   ')

    await submitInput(tree, PLACEHOLDER)

    expect(streamChat).not.toHaveBeenCalled()
    expect(premium.incrementQuery).not.toHaveBeenCalled()
  })

  it('sends the full conversation on follow-up questions', async () => {
    streamsTokens('First answer')
    const tree = await render()
    await pressText(tree, 'Should I go for a run today?')

    streamsTokens('Second answer')
    typeInto(tree, PLACEHOLDER, 'And tomorrow?')
    await submitInput(tree, PLACEHOLDER)

    expect(streamChat.mock.calls[1]?.[0]).toEqual([
      { role: 'user', content: 'Should I go for a run today?' },
      { role: 'assistant', content: 'First answer' },
      { role: 'user', content: 'And tomorrow?' },
    ])
    expect(premium.incrementQuery).toHaveBeenCalledTimes(2)
  })

  it('enables the send button only when there is text and nothing is streaming', async () => {
    const tree = await render()
    expect(sendButton(tree).props.disabled).toBe(true)

    typeInto(tree, PLACEHOLDER, 'hi')
    expect(sendButton(tree).props.disabled).toBe(false)
  })

  it('sends from the send button', async () => {
    streamsTokens('ok')
    const tree = await render()
    typeInto(tree, PLACEHOLDER, 'hi')

    await act(async () => {
      await sendButton(tree).props.onPress()
    })

    expect(streamChat).toHaveBeenCalledTimes(1)
  })
})

describe('AIChatSheet — while streaming', () => {
  it('shows a cursor, locks the input, and ignores further sends until the reply finishes', async () => {
    const pending = deferred()
    streamChat.mockReturnValue(pending.promise)
    const tree = await render()
    typeInto(tree, PLACEHOLDER, 'first')
    await submitInput(tree, PLACEHOLDER, { wait: false })

    expect(hasText(tree, '▍')).toBe(true)
    expect(tree.root.findAll((n) => n.props.placeholder === PLACEHOLDER && typeof n.props.onChangeText === 'function')[0]?.props.editable).toBe(false)
    expect(sendButton(tree).props.disabled).toBe(true)

    typeInto(tree, PLACEHOLDER, 'second')
    await submitInput(tree, PLACEHOLDER, { wait: false })
    expect(streamChat).toHaveBeenCalledTimes(1)

    await act(async () => {
      pending.resolve()
    })
    expect(hasText(tree, '▍')).toBe(false)
    expect(tree.root.findAll((n) => n.props.placeholder === PLACEHOLDER && typeof n.props.onChangeText === 'function')[0]?.props.editable).toBe(true)
  })
})

describe('AIChatSheet — failures and limits', () => {
  it('replaces the reply with an apology when the request fails, then recovers', async () => {
    streamChat.mockRejectedValue(new Error('network'))
    const tree = await render()

    await pressText(tree, 'Should I go for a run today?')

    expect(hasText(tree, 'Sorry, something went wrong. Please try again.')).toBe(true)
    expect(hasText(tree, '▍')).toBe(false)
    expect(sendButton(tree).props.disabled).toBe(true) // empty input, but no longer locked by streaming
    typeInto(tree, PLACEHOLDER, 'retry')
    expect(sendButton(tree).props.disabled).toBe(false)
  })

  it('shows the paywall instead of sending when the daily limit is reached', async () => {
    premium.canQuery.mockReturnValue(false)
    const tree = await render()

    await pressText(tree, 'Should I go for a run today?')

    expect(premium.showPaywall).toHaveBeenCalledTimes(1)
    expect(streamChat).not.toHaveBeenCalled()
    expect(premium.incrementQuery).not.toHaveBeenCalled()
    expect(hasText(tree, 'Best time for outdoor exercise?')).toBe(true) // still the empty state
  })
})
