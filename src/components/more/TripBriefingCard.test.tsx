import React from 'react'
import renderer, { act } from 'react-test-renderer'
import TripBriefingCard from './TripBriefingCard'
import { buildWeatherContext } from '@/src/api/openai'
import { deferred, weatherContext } from '@/src/utils/testFixtures'
import { hasText, pressText, typeInto } from '@/src/utils/testScreenHelpers'

// First render is slow under parallel workers; 5s is too tight.
jest.setTimeout(30_000)

jest.mock('@/src/api/openai', () => ({
  ...jest.requireActual('@/src/api/openai'),
  getTripBriefing: jest.fn(),
}))

jest.mock('@/src/store/premiumStore', () => {
  const state = { canQuery: jest.fn(), incrementQuery: jest.fn(), showPaywall: jest.fn() }
  return { usePremiumStore: () => state, __state: state }
})

const { getTripBriefing } = jest.requireMock('@/src/api/openai') as { getTripBriefing: jest.Mock }
const { __state: premium } = jest.requireMock('@/src/store/premiumStore') as {
  __state: { canQuery: jest.Mock; incrementQuery: jest.Mock; showPaywall: jest.Mock }
}

const CTX = weatherContext()
const DEST = 'Destination (e.g. Tokyo, Japan)'
const START = 'Start (YYYY-MM-DD)'
const END = 'End (YYYY-MM-DD)'
let trees: renderer.ReactTestRenderer[] = []

async function render(): Promise<renderer.ReactTestRenderer> {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(<TripBriefingCard weatherCtx={CTX} />)
  })
  trees.push(tree)
  return tree
}

function fillForm(tree: renderer.ReactTestRenderer, destination = 'Tokyo, Japan', start = '2026-10-01', end = '2026-10-05'): void {
  typeInto(tree, DEST, destination)
  typeInto(tree, START, start)
  typeInto(tree, END, end)
}

/** The generate button: the only Pressable with an explicit `disabled` prop. */
function generateButton(tree: renderer.ReactTestRenderer) {
  const [button] = tree.root.findAll((n) => typeof n.props.onPress === 'function' && typeof n.props.disabled === 'boolean')
  if (!button) throw new Error('generate button not found')
  return button
}

beforeEach(() => {
  getTripBriefing.mockReset()
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

describe('TripBriefingCard — form', () => {
  it('renders the destination form in its initial state', async () => {
    const tree = await render()

    expect(hasText(tree, 'Trip Weather Briefing')).toBe(true)
    expect(hasText(tree, 'Generate Briefing')).toBe(true)
    expect(tree.root.findAll((n) => n.props.placeholder === DEST).length).toBeGreaterThan(0)
  })

  it('disables generation until destination, start and end are all filled', async () => {
    const tree = await render()
    expect(generateButton(tree).props.disabled).toBe(true)

    typeInto(tree, DEST, 'Tokyo')
    typeInto(tree, START, '2026-10-01')
    expect(generateButton(tree).props.disabled).toBe(true)

    typeInto(tree, END, '2026-10-05')
    expect(generateButton(tree).props.disabled).toBe(false)
  })

  it('treats whitespace-only fields as empty', async () => {
    const tree = await render()

    fillForm(tree, '   ', '2026-10-01', '2026-10-05')

    expect(generateButton(tree).props.disabled).toBe(true)
  })

  it('does nothing if generate is triggered with a blank field', async () => {
    const tree = await render()
    typeInto(tree, DEST, 'Tokyo')

    await act(async () => {
      await generateButton(tree).props.onPress()
    })

    expect(getTripBriefing).not.toHaveBeenCalled()
    expect(premium.incrementQuery).not.toHaveBeenCalled()
  })
})

describe('TripBriefingCard — generating', () => {
  it('requests a briefing with trimmed inputs and the weather context, and counts the query', async () => {
    getTripBriefing.mockResolvedValue('Pack layers.')
    const tree = await render()
    fillForm(tree, '  Tokyo, Japan ', ' 2026-10-01', '2026-10-05 ')

    await pressText(tree, 'Generate Briefing')

    expect(getTripBriefing).toHaveBeenCalledWith('Tokyo, Japan', '2026-10-01', '2026-10-05', buildWeatherContext(CTX))
    expect(premium.incrementQuery).toHaveBeenCalledTimes(1)
  })

  it('shows a busy, disabled button while the briefing is generated', async () => {
    const pending = deferred<string>()
    getTripBriefing.mockReturnValue(pending.promise)
    const tree = await render()
    fillForm(tree)

    await pressText(tree, 'Generate Briefing', { wait: false })

    expect(hasText(tree, 'Generate Briefing')).toBe(false)
    expect(generateButton(tree).props.disabled).toBe(true)

    await act(async () => {
      pending.resolve('Done')
    })
    expect(hasText(tree, 'Done')).toBe(true)
  })

  it('shows the briefing with its trip summary', async () => {
    getTripBriefing.mockResolvedValue('Mild and dry. Pack a light jacket.')
    const tree = await render()
    fillForm(tree)

    await pressText(tree, 'Generate Briefing')

    expect(hasText(tree, 'Tokyo, Japan · 2026-10-01 – 2026-10-05')).toBe(true)
    expect(hasText(tree, 'Mild and dry. Pack a light jacket.')).toBe(true)
    expect(hasText(tree, 'Plan another trip')).toBe(true)
    expect(hasText(tree, 'Generate Briefing')).toBe(false)
  })

  it('returns to the form, keeping the trip details, when planning another trip', async () => {
    getTripBriefing.mockResolvedValue('Mild.')
    const tree = await render()
    fillForm(tree)
    await pressText(tree, 'Generate Briefing')

    await pressText(tree, 'Plan another trip')

    expect(hasText(tree, 'Generate Briefing')).toBe(true)
    expect(hasText(tree, 'Mild.')).toBe(false)
    expect(tree.root.findAll((n) => n.props.placeholder === DEST && typeof n.props.onChangeText === 'function')[0]?.props.value).toBe('Tokyo, Japan')
  })

  it('shows an error and keeps the form when generation fails', async () => {
    getTripBriefing.mockRejectedValue(new Error('quota'))
    const tree = await render()
    fillForm(tree)

    await pressText(tree, 'Generate Briefing')

    expect(hasText(tree, 'Could not generate briefing. Please try again.')).toBe(true)
    expect(hasText(tree, 'Generate Briefing')).toBe(true)
    expect(generateButton(tree).props.disabled).toBe(false)
  })

  it('clears the error on a successful retry', async () => {
    getTripBriefing.mockRejectedValueOnce(new Error('quota')).mockResolvedValueOnce('Sunny.')
    const tree = await render()
    fillForm(tree)

    await pressText(tree, 'Generate Briefing')
    await pressText(tree, 'Generate Briefing')

    expect(hasText(tree, 'Could not generate briefing. Please try again.')).toBe(false)
    expect(hasText(tree, 'Sunny.')).toBe(true)
  })

  it('shows the paywall instead of generating when the daily limit is reached', async () => {
    premium.canQuery.mockReturnValue(false)
    const tree = await render()
    fillForm(tree)

    await pressText(tree, 'Generate Briefing')

    expect(premium.showPaywall).toHaveBeenCalledTimes(1)
    expect(getTripBriefing).not.toHaveBeenCalled()
    expect(premium.incrementQuery).not.toHaveBeenCalled()
  })
})
