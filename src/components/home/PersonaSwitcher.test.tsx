import React from 'react'
import { act } from 'react-test-renderer'
import renderer from 'react-test-renderer'
import PersonaSwitcher from './PersonaSwitcher'
import { usePersonaStore } from '@/src/store/personaStore'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

beforeEach(() => {
  usePersonaStore.setState({ persona: 'athlete' })
})

describe('PersonaSwitcher', () => {
  it('renders athlete and wellness pills', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<PersonaSwitcher />)
    })
    const json = JSON.stringify(tree.toJSON())
    expect(json).toMatch(/Athlete/)
    expect(json).toMatch(/Wellness/)
  })
})
