import React from 'react'
import renderer, { act } from 'react-test-renderer'
import AuthLayout from '@/app/(auth)/_layout'
import TabLayout from '@/app/(tabs)/_layout'
import NotFoundScreen from '@/app/+not-found'
import { BG } from '@/src/theme/colors'
import { hasText } from '@/src/utils/testScreenHelpers'

// First render of a screen is slow under parallel workers (RN + icon transforms); 5s is too tight.
jest.setTimeout(30_000)

// Router primitives render as inspectable host elements; container stubs keep their children.
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react') as typeof import('react')
  const container = (name: string) => (props: { children?: React.ReactNode }) => R.createElement(name, props, props.children)
  const leaf = (name: string) => (props: object) => R.createElement(name, props)
  return {
    Stack: Object.assign(container('StackStub'), { Screen: leaf('StackScreenStub') }),
    Tabs: Object.assign(container('TabsStub'), { Screen: leaf('TabScreenStub') }),
    Link: container('LinkStub'),
  }
})

jest.mock('@/src/components/navigation/StitchTabBar', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  default: (props: object) => (require('react') as typeof import('react')).createElement('StitchTabBarStub', props),
}))

let trees: renderer.ReactTestRenderer[] = []

function render(element: React.ReactElement): renderer.ReactTestRenderer {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(element)
  })
  trees.push(tree)
  return tree
}

const find = (tree: renderer.ReactTestRenderer, type: string) => tree.root.findAllByType(type as never)

afterEach(() => {
  act(() => {
    trees.forEach((t) => t.unmount())
  })
  trees = []
})

describe('TabLayout', () => {
  it('registers the five main tabs in order, plus a hidden template tab', () => {
    const tree = render(<TabLayout />)

    const screens = find(tree, 'TabScreenStub').map((s) => s.props)
    expect(screens.map((s) => s.name)).toEqual(['index', 'radar', 'air', 'sky', 'more', 'two'])
    expect(screens.slice(0, 5).map((s) => s.options.title)).toEqual(['Home', 'Radar', 'Air', 'Sky', 'More'])
    expect(screens[5]?.options).toEqual({ href: null })
  })

  it('hides headers and labels and paints the scene with the app background', () => {
    const tree = render(<TabLayout />)

    expect(find(tree, 'TabsStub')[0]?.props.screenOptions).toEqual({
      headerShown: false,
      tabBarShowLabel: false,
      sceneStyle: { backgroundColor: BG },
    })
  })

  it('renders the custom tab bar with the navigator props', () => {
    const tree = render(<TabLayout />)
    const tabBar = find(tree, 'TabsStub')[0]?.props.tabBar as (props: object) => React.ReactElement

    const bar = render(tabBar({ state: { index: 2 } }))

    expect(find(bar, 'StitchTabBarStub')[0]?.props).toEqual({ state: { index: 2 } })
  })
})

describe('AuthLayout', () => {
  it('registers the sign-in screens', () => {
    const tree = render(<AuthLayout />)

    expect(find(tree, 'StackScreenStub').map((s) => s.props.name)).toEqual([
      'login',
      'signup',
      'forgot',
    ])
  })

  it('presents screens headerless, sliding up from the bottom on the app background', () => {
    const tree = render(<AuthLayout />)

    expect(find(tree, 'StackStub')[0]?.props.screenOptions).toEqual({
      headerShown: false,
      contentStyle: { backgroundColor: BG },
      animation: 'slide_from_bottom',
    })
  })
})

describe('NotFoundScreen', () => {
  it('titles the screen and explains the route is missing', () => {
    const tree = render(<NotFoundScreen />)

    expect(find(tree, 'StackScreenStub')[0]?.props.options).toEqual({ title: 'Oops!' })
    expect(hasText(tree, "This screen doesn't exist.")).toBe(true)
  })

  it('links back to the home screen', () => {
    const tree = render(<NotFoundScreen />)

    expect(find(tree, 'LinkStub')[0]?.props.href).toBe('/')
    expect(hasText(tree, 'Go to home screen!')).toBe(true)
  })
})
