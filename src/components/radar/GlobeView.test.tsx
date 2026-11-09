import React from 'react'
import { ActivityIndicator, Platform } from 'react-native'
import WebView from 'react-native-webview'
import renderer, { act } from 'react-test-renderer'
import GlobeView from './GlobeView'
import { buildGlobeHTML } from './buildGlobeHTML'

// First render is slow under parallel workers; 5s is too tight.
jest.setTimeout(30_000)

const WEATHER = {
  temperature: 22,
  precipitationProbability: 15,
  windSpeed: 12,
  windDirection: 270,
  usAqi: 35,
  conditionLabel: 'Partly Cloudy',
}

const restores: Array<() => void> = []
let trees: renderer.ReactTestRenderer[] = []

function setPlatform(os: 'ios' | 'android'): void {
  const original = Object.getOwnPropertyDescriptor(Platform, 'OS')
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true, writable: true })
  restores.push(() => {
    if (original) Object.defineProperty(Platform, 'OS', original)
  })
}

async function render(layer: 'precipitation' | 'temperature' | 'wind' | 'air' = 'precipitation'): Promise<renderer.ReactTestRenderer> {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(<GlobeView lat={51.5} lon={-0.1} layer={layer} weather={WEATHER} />)
  })
  trees.push(tree)
  return tree
}

const webView = (tree: renderer.ReactTestRenderer) => tree.root.findByType(WebView)
const spinner = (tree: renderer.ReactTestRenderer) => tree.root.findAllByType(ActivityIndicator)

function message(tree: renderer.ReactTestRenderer, payload: string): void {
  act(() => {
    webView(tree).props.onMessage({ nativeEvent: { data: payload } })
  })
}

afterEach(() => {
  act(() => {
    trees.forEach((t) => t.unmount())
  })
  trees = []
  while (restores.length > 0) restores.pop()?.()
  jest.useRealTimers()
})

describe('GlobeView', () => {
  it('renders without crashing', async () => {
    const tree = await render()
    expect(tree.toJSON()).not.toBeNull()
  })

  it('loads the globe HTML built for the location, layer and conditions', async () => {
    const tree = await render('wind')

    expect(webView(tree).props.source.html).toBe(buildGlobeHTML(51.5, -0.1, 'wind', WEATHER))
  })

  it('rebuilds the globe when the layer changes', async () => {
    const tree = await render('wind')

    await act(async () => {
      tree.update(<GlobeView lat={51.5} lon={-0.1} layer="air" weather={WEATHER} />)
    })

    expect(webView(tree).props.source.html).toBe(buildGlobeHTML(51.5, -0.1, 'air', WEATHER))
  })

  it('needs an explicit CDN origin on Android so script requests resolve', async () => {
    setPlatform('android')
    const tree = await render()

    expect(webView(tree).props.source.baseUrl).toBe('https://cdn.jsdelivr.net')
  })

  it('uses no base URL on iOS', async () => {
    setPlatform('ios')
    const tree = await render()

    expect(webView(tree).props.source.baseUrl).toBeUndefined()
  })

  it('allows the scripts and non-scrolling behaviour the globe needs', async () => {
    const tree = await render()

    expect(webView(tree).props).toMatchObject({
      javaScriptEnabled: true,
      originWhitelist: ['*'],
      scrollEnabled: false,
      bounces: false,
      mixedContentMode: 'always',
    })
  })
})

describe('GlobeView — loading overlay', () => {
  it('shows a spinner until the globe reports it is ready', async () => {
    const tree = await render()
    expect(spinner(tree)).toHaveLength(1)

    message(tree, JSON.stringify({ type: 'ready' }))

    expect(spinner(tree)).toHaveLength(0)
  })

  it.each([
    ['a different message type', JSON.stringify({ type: 'error', msg: 'boom' })],
    ['malformed JSON', 'not json'],
    ['an empty payload', ''],
  ])('keeps the spinner for %s', async (_label, payload) => {
    const tree = await render()

    message(tree, payload)

    expect(spinner(tree)).toHaveLength(1)
  })

  it('falls back to hiding the spinner 8 seconds after the page loads', async () => {
    jest.useFakeTimers({
      // Only setTimeout is faked so act()/promises keep working.
      doNotFake: ['setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'],
    })
    const tree = await render()

    act(() => {
      webView(tree).props.onLoadEnd()
    })
    act(() => {
      jest.advanceTimersByTime(7999)
    })
    expect(spinner(tree)).toHaveLength(1)

    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(spinner(tree)).toHaveLength(0)
  })
})
