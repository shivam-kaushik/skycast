import React from 'react'
import TestRenderer from 'react-test-renderer'
import RadarTimeScrubber from '@/src/components/radar/RadarTimeScrubber'

describe('RadarTimeScrubber', () => {
  it('renders distinct start/end labels with date when span crosses days', () => {
    const times = ['2026-04-02T06:00:00.000Z', '2026-04-04T06:00:00.000Z']
    const tr = TestRenderer.create(
      <RadarTimeScrubber times={times} selectedIndex={0} isPlaying={false} onSelectIndex={() => {}} />,
    )
    const texts = tr.root
      .findAllByType('Text' as React.ElementType)
      .map((n) => (typeof n.props.children === 'string' ? n.props.children : ''))
      .filter(Boolean)
    const row = texts.filter((t) => t !== '—' && t.length > 4)
    expect(row.length).toBeGreaterThanOrEqual(2)
    expect(row[0]).not.toBe(row[1])
  })
})
