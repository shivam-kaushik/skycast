import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import RadarTimeScrubber from '@/src/components/radar/RadarTimeScrubber'
import { StyleSheet, Text, View } from 'react-native'

// First render is slow under parallel workers; 5s is too tight.
jest.setTimeout(30_000)

const BASE = Date.parse('2026-04-02T06:00:00.000Z')
const hourly = (n: number): string[] => Array.from({ length: n }, (_, i) => new Date(BASE + i * 3_600_000).toISOString())

let renderers: TestRenderer.ReactTestRenderer[] = []

interface Options {
  times?: string[]
  selectedIndex?: number
  isPlaying?: boolean
  onSelectIndex?: (i: number) => void
  onInteractionStart?: () => void
  width?: number | null
}

async function render({
  times = hourly(5),
  selectedIndex = 0,
  isPlaying = false,
  onSelectIndex = () => {},
  onInteractionStart,
  width = 400,
}: Options = {}): Promise<TestRenderer.ReactTestRenderer> {
  let tr!: TestRenderer.ReactTestRenderer
  await act(async () => {
    tr = TestRenderer.create(
      <RadarTimeScrubber
        times={times}
        selectedIndex={selectedIndex}
        isPlaying={isPlaying}
        onSelectIndex={onSelectIndex}
        onInteractionStart={onInteractionStart}
      />,
    )
  })
  renderers.push(tr)
  if (width !== null) await layOut(tr, width)
  return tr
}

/** The track: the View that owns both onLayout and the PanResponder handlers. */
const track = (tr: TestRenderer.ReactTestRenderer) =>
  tr.root.findAllByType(View as React.ElementType).find((v) => v.props.onLayout !== undefined)

async function layOut(tr: TestRenderer.ReactTestRenderer, width: number): Promise<void> {
  await act(async () => {
    track(tr)?.props.onLayout({ nativeEvent: { layout: { width, height: 32, x: 0, y: 0 } } })
  })
}

const labelTexts = (tr: TestRenderer.ReactTestRenderer): string[] =>
  tr.root
    .findAllByType(Text as React.ElementType)
    .map((n) => (typeof n.props.children === 'string' ? n.props.children : ''))
    .filter(Boolean)

/** Well-formed touch event for RN's PanResponder (which reads touchHistory). */
function touch(x: number, timestamp: number) {
  return {
    nativeEvent: { locationX: x },
    touchHistory: {
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: timestamp,
      numberActiveTouches: 1,
      touchBank: [
        {
          touchActive: true,
          startPageX: x, startPageY: 0, startTimeStamp: timestamp,
          currentPageX: x, currentPageY: 0, currentTimeStamp: timestamp,
          previousPageX: x, previousPageY: 0, previousTimeStamp: timestamp,
        },
      ],
    },
  }
}

const grant = (tr: TestRenderer.ReactTestRenderer, x: number, t = 1) =>
  act(() => {
    track(tr)?.props.onResponderGrant(touch(x, t))
  })
const move = (tr: TestRenderer.ReactTestRenderer, x: number, t: number) =>
  act(() => {
    track(tr)?.props.onResponderMove(touch(x, t))
  })
const release = (tr: TestRenderer.ReactTestRenderer, x: number, t: number) =>
  act(() => {
    track(tr)?.props.onResponderRelease(touch(x, t))
  })

afterEach(() => {
  act(() => {
    renderers.forEach((r) => r.unmount())
  })
  renderers = []
})

describe('RadarTimeScrubber — empty and layout', () => {
  it('shows a loading message when there are no times', async () => {
    const tr = await render({ times: [], width: null })

    expect(labelTexts(tr)).toContain('Loading timeline…')
    expect(track(tr)).toBeUndefined()
  })

  it('renders distinct start/end labels with date when span crosses days', async () => {
    const times = ['2026-04-02T06:00:00.000Z', '2026-04-04T06:00:00.000Z']
    const tr = await render({ times })

    const row = labelTexts(tr).filter((t) => t !== '—' && t.length >= 3)
    expect(row.length).toBeGreaterThanOrEqual(2)
    expect(row[0]).not.toBe(row[row.length - 1])
  })

  it('waits for the track to be measured before drawing labels', async () => {
    const tr = await render({ width: null })
    expect(labelTexts(tr)).toEqual([])

    await layOut(tr, 300)

    expect(labelTexts(tr).length).toBeGreaterThan(0)
  })
})

describe('RadarTimeScrubber — relative labels', () => {
  it('labels the first time "Now" and later times by whole hours ahead', async () => {
    const tr = await render({ times: hourly(3) })

    expect(labelTexts(tr)).toEqual(['Now', '+1h', '+2h'])
  })

  it('labels every time when there are five or fewer', async () => {
    const tr = await render({ times: hourly(5) })

    expect(labelTexts(tr)).toEqual(['Now', '+1h', '+2h', '+3h', '+4h'])
  })

  it('thins labels to the ends plus three evenly spaced interior points for longer timelines', async () => {
    const tr = await render({ times: hourly(13) })

    expect(labelTexts(tr)).toEqual(['Now', '+3h', '+6h', '+9h', '+12h'])
  })

  it('shows a single "Now" label for a one-frame timeline', async () => {
    const tr = await render({ times: hourly(1) })

    expect(labelTexts(tr)).toEqual(['Now'])
  })

  it('treats anything within 30 minutes of the start as "Now" and rounds other offsets to the nearest hour', async () => {
    const times = [
      new Date(BASE).toISOString(),
      new Date(BASE + 29 * 60_000).toISOString(),
      new Date(BASE + 90 * 60_000).toISOString(),
      new Date(BASE + 149 * 60_000).toISOString(),
    ]
    const tr = await render({ times })

    expect(labelTexts(tr)).toEqual(['Now', 'Now', '+2h', '+2h'])
  })

  it('skips labels for times it cannot parse', async () => {
    const tr = await render({ times: ['not-a-time', new Date(BASE).toISOString()] })

    expect(labelTexts(tr)).toHaveLength(1)
  })

  it('highlights only the selected label', async () => {
    const tr = await render({ times: hourly(3), selectedIndex: 1 })

    const styled = tr.root
      .findAllByType(Text as React.ElementType)
      .filter((n) => ['Now', '+1h', '+2h'].includes(n.props.children))
      .map((n) => [n.props.children, StyleSheet.flatten(n.props.style).color])
    expect(styled).toEqual([
      ['Now', expect.not.stringMatching(/^#ffffff$/)],
      ['+1h', '#ffffff'],
      ['+2h', expect.not.stringMatching(/^#ffffff$/)],
    ])
  })

  it('clamps an out-of-range selection', async () => {
    const tr = await render({ times: hourly(3), selectedIndex: 99 })

    const active = tr.root
      .findAllByType(Text as React.ElementType)
      .filter((n) => StyleSheet.flatten(n.props.style)?.color === '#ffffff')
      .map((n) => n.props.children)
    expect(active).toEqual(['+2h'])
  })
})

describe('RadarTimeScrubber — tick marks', () => {
  const ticks = (tr: TestRenderer.ReactTestRenderer) =>
    tr.root
      .findAllByType(View as React.ElementType)
      .map((v) => StyleSheet.flatten(v.props.style))
      .filter((s) => s && [5, 9].includes(s.height as number) && [1, 2].includes(s.width as number))

  it('draws one tick per frame', async () => {
    const tr = await render({ times: hourly(7) })

    expect(ticks(tr)).toHaveLength(7)
  })

  it('emphasizes the first, last and selected ticks', async () => {
    const tr = await render({ times: hourly(5), selectedIndex: 2 })

    const tall = ticks(tr).filter((s) => s?.height === 9)
    expect(tall).toHaveLength(3)
    expect(ticks(tr).filter((s) => s?.height === 5)).toHaveLength(2)
  })
})

describe('RadarTimeScrubber — dragging', () => {
  // 5 frames across 400px → frame boundaries every 100px
  it.each([
    [0, 0],
    [100, 1],
    [200, 2],
    [400, 4],
    [130, 1],
    [170, 2],
  ])('selects the nearest frame when touching x=%p (index %p)', async (x, expected) => {
    const onSelectIndex = jest.fn()
    const tr = await render({ onSelectIndex })

    grant(tr, x)

    expect(onSelectIndex).toHaveBeenCalledWith(expected)
  })

  it('clamps touches beyond either end of the track', async () => {
    const onSelectIndex = jest.fn()
    const tr = await render({ onSelectIndex })

    grant(tr, -50)
    move(tr, 900, 2)

    expect(onSelectIndex.mock.calls.map((c) => c[0])).toEqual([0, 4])
  })

  it('reports the start of an interaction once, on touch down', async () => {
    const onInteractionStart = jest.fn()
    const tr = await render({ onInteractionStart })

    grant(tr, 100)
    move(tr, 200, 2)
    release(tr, 300, 3)

    expect(onInteractionStart).toHaveBeenCalledTimes(1)
  })

  it('follows the finger and only reports when the frame changes', async () => {
    const onSelectIndex = jest.fn()
    const tr = await render({ onSelectIndex })

    grant(tr, 100) // → 1
    move(tr, 110, 2) // still 1
    move(tr, 190, 3) // → 2
    move(tr, 205, 4) // still 2
    move(tr, 310, 5) // → 3

    expect(onSelectIndex.mock.calls.map((c) => c[0])).toEqual([1, 2, 3])
  })

  it('commits the final position on release', async () => {
    const onSelectIndex = jest.fn()
    const tr = await render({ onSelectIndex })

    grant(tr, 100)
    release(tr, 400, 2)

    expect(onSelectIndex.mock.calls.map((c) => c[0])).toEqual([1, 4])
  })

  it('does not select anything when the gesture is terminated', async () => {
    const onSelectIndex = jest.fn()
    const tr = await render({ onSelectIndex })

    act(() => {
      track(tr)?.props.onResponderTerminate(touch(0, 1))
    })

    expect(onSelectIndex).not.toHaveBeenCalled()
  })

  it('claims the touch responder whenever there are frames', async () => {
    const tr = await render()

    expect(track(tr)?.props.onStartShouldSetResponder()).toBe(true)
    expect(track(tr)?.props.onMoveShouldSetResponder()).toBe(true)
  })

  it('always selects index 0 for a single-frame timeline', async () => {
    const onSelectIndex = jest.fn()
    const tr = await render({ times: hourly(1), onSelectIndex })

    grant(tr, 350)

    expect(onSelectIndex).toHaveBeenCalledWith(0)
  })

  it('ignores drag movement that arrives without a preceding touch down', async () => {
    const onSelectIndex = jest.fn()
    const tr = await render({ onSelectIndex })

    move(tr, 200, 2)

    expect(onSelectIndex).not.toHaveBeenCalled()
  })
})

describe('RadarTimeScrubber — playback', () => {
  it('renders while playing and while paused, and when the frame advances', async () => {
    const tr = await render({ isPlaying: true, selectedIndex: 0 })

    await act(async () => {
      tr.update(
        <RadarTimeScrubber times={hourly(5)} selectedIndex={1} isPlaying={true} onSelectIndex={() => {}} />,
      )
    })
    await act(async () => {
      tr.update(
        <RadarTimeScrubber times={hourly(5)} selectedIndex={2} isPlaying={false} onSelectIndex={() => {}} />,
      )
    })

    expect(labelTexts(tr)).toEqual(['Now', '+1h', '+2h', '+3h', '+4h'])
  })
})
