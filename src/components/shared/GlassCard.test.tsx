import React from 'react'
import { Text } from 'react-native'
import renderer, { act } from 'react-test-renderer'
import GlassCard from './GlassCard'

describe('GlassCard', () => {
  it('renders children in a View when no onPress', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<GlassCard><Text>Hello</Text></GlassCard>)
    })
    expect(JSON.stringify(tree.toJSON())).toMatch(/Hello/)
  })

  it('renders as Pressable when onPress provided', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<GlassCard onPress={() => {}}><Text>Tap</Text></GlassCard>)
    })
    const json = tree.toJSON() as { type: string }
    expect(json.type).toBe('View')
  })
})
