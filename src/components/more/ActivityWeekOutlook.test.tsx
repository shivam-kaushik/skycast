import React from 'react'
import renderer, { act } from 'react-test-renderer'
import ActivityWeekOutlook from './ActivityWeekOutlook'
import type { DayActivityOutlook } from '@/src/utils/activityWeekOutlook'

const MOCK_DAY: DayActivityOutlook = {
  date: '2026-04-01',
  dayLabel: 'Today',
  topActivities: [
    {
      name: 'Running',
      score: {
        score: 8,
        label: 'Good',
        reason: 'Mild and dry',
        color: '#06D6A0',
      },
    },
    {
      name: 'Cycling',
      score: {
        score: 7,
        label: 'Good',
        reason: 'Light breeze',
        color: '#06D6A0',
      },
    },
  ],
}

describe('ActivityWeekOutlook', () => {
  it('renders day label and top activity', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<ActivityWeekOutlook days={[MOCK_DAY]} />)
    })
    const json = JSON.stringify(tree.toJSON())
    expect(json).toMatch(/Today/)
    expect(json).toMatch(/Running/)
  })
})
