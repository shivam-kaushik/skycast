import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import RadarTimeScrubber from '@/src/components/radar/RadarTimeScrubber'
import { View } from 'react-native'

describe('RadarTimeScrubber', () => {
  it('renders distinct start/end labels with date when span crosses days', async () => {
    const times = ['2026-04-02T06:00:00.000Z', '2026-04-04T06:00:00.000Z']
    let tr!: TestRenderer.ReactTestRenderer
    await act(async () => {
      tr = TestRenderer.create(
        <RadarTimeScrubber times={times} selectedIndex={0} isPlaying={false} onSelectIndex={() => {}} />,
      )
    })

    // Fire onLayout to give the track a width so labels render
    await act(async () => {
      const trackView = tr.root.findAllByType(View as React.ElementType).find(
        (v) => v.props.onLayout !== undefined
      )
      trackView?.props.onLayout?.({ nativeEvent: { layout: { width: 300, height: 32, x: 0, y: 0 } } })
    })

    const texts = tr.root
      .findAllByType('Text' as React.ElementType)
      .map((n) => (typeof n.props.children === 'string' ? n.props.children : ''))
      .filter(Boolean)
    const row = texts.filter((t) => t !== '—' && t.length >= 3)
    expect(row.length).toBeGreaterThanOrEqual(2)
    expect(row[0]).not.toBe(row[row.length - 1])
    tr.unmount()
  })
})
