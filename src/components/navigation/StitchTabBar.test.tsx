import React from 'react'
import renderer, { act } from 'react-test-renderer'
import StitchTabBar from './StitchTabBar'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

const TAB_NAMES = ['index', 'radar', 'air', 'sky', 'more']

function makeProps(): BottomTabBarProps {
  const routes = TAB_NAMES.map((name) => ({ key: name, name, params: undefined }))
  return {
    state: { index: 0, routes, key: 'tab', history: [], type: 'tab', stale: false, routeNames: TAB_NAMES },
    descriptors: Object.fromEntries(routes.map((r) => [r.key, { options: { title: r.name } } as never])),
    navigation: { emit: jest.fn().mockReturnValue({ defaultPrevented: false }), navigate: jest.fn() } as never,
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  }
}

describe('StitchTabBar', () => {
  it('renders all 5 tab buttons', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<StitchTabBar {...makeProps()} />)
    })
    const json = JSON.stringify(tree.toJSON())
    expect(json).toMatch(/tab-index/)
    expect(json).toMatch(/tab-sky/)
    expect(json).toMatch(/tab-more/)
  })
})
