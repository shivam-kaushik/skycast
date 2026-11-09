import { Text } from 'react-native'
import { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'

/** Flatten a Text node's children into a single string. */
function textOf(node: ReactTestInstance): string {
  const parts = Array.isArray(node.props.children) ? node.props.children : [node.props.children]
  return parts.flat(Infinity).filter((c: unknown) => typeof c === 'string' || typeof c === 'number').join('')
}

/** Every rendered <Text> string, in tree order. */
export function allText(tree: ReactTestRenderer): string[] {
  return tree.root.findAllByType(Text).map(textOf)
}

export function hasText(tree: ReactTestRenderer, text: string): boolean {
  return allText(tree).some((t) => t === text)
}

export function hasTextContaining(tree: ReactTestRenderer, fragment: string): boolean {
  return allText(tree).some((t) => t.includes(fragment))
}

/** The nearest ancestor (or self) exposing an `onPress` handler. */
function pressableAncestor(node: ReactTestInstance): ReactTestInstance | null {
  let current: ReactTestInstance | null = node
  while (current) {
    if (typeof current.props.onPress === 'function') return current
    current = current.parent
  }
  return null
}

/**
 * Press the button whose label is exactly `label`. By default waits for the (possibly async) handler
 * to finish; pass { wait: false } to leave it in flight, e.g. to assert a loading state.
 * Never nest this inside another act() — use the wait option instead.
 */
export async function pressText(
  tree: ReactTestRenderer,
  label: string,
  { wait = true }: { wait?: boolean } = {},
): Promise<void> {
  const target = tree.root.findAllByType(Text).find((node) => textOf(node) === label)
  if (!target) throw new Error(`pressText: no <Text> with "${label}"`)
  const pressable = pressableAncestor(target)
  if (!pressable) throw new Error(`pressText: "${label}" is not inside a pressable`)
  await act(async () => {
    const result = pressable.props.onPress()
    if (wait) await result
    else await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

/** Press the pressable that has no text label, matched by a distinguishing prop (e.g. hitSlop). */
export async function pressByProps(tree: ReactTestRenderer, props: Record<string, unknown>): Promise<void> {
  const [target] = tree.root.findAll(
    (n) => typeof n.props.onPress === 'function' && Object.entries(props).every(([k, v]) => n.props[k] === v),
  )
  if (!target) throw new Error(`pressByProps: nothing matches ${JSON.stringify(props)}`)
  await act(async () => {
    await target.props.onPress()
  })
}

/** The TextInput with this placeholder (the composite that owns `onChangeText`). */
export function inputByPlaceholder(tree: ReactTestRenderer, placeholder: string): ReactTestInstance {
  const [input] = tree.root.findAll(
    (n) => n.props.placeholder === placeholder && typeof n.props.onChangeText === 'function',
  )
  if (!input) throw new Error(`inputByPlaceholder: no input with placeholder "${placeholder}"`)
  return input
}

export function typeInto(tree: ReactTestRenderer, placeholder: string, value: string): void {
  const input = inputByPlaceholder(tree, placeholder)
  act(() => {
    input.props.onChangeText(value)
  })
}

/**
 * Submit a TextInput via its keyboard "done/go" handler. By default waits for the handler to finish;
 * pass { wait: false } when the handler is deliberately left pending (e.g. an in-flight request).
 */
export async function submitInput(
  tree: ReactTestRenderer,
  placeholder: string,
  { wait = true }: { wait?: boolean } = {},
): Promise<void> {
  const input = inputByPlaceholder(tree, placeholder)
  await act(async () => {
    const result = input.props.onSubmitEditing()
    if (wait) await result
    else await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

/** Press the element with this `testID` (the composite that owns `onPress`). */
export async function pressByTestId(tree: ReactTestRenderer, testID: string): Promise<void> {
  const [target] = tree.root.findAll((n) => n.props.testID === testID && typeof n.props.onPress === 'function')
  if (!target) throw new Error(`pressByTestId: nothing with testID "${testID}"`)
  await act(async () => {
    await target.props.onPress()
  })
}
