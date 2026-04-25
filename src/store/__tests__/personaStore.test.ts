jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

import { act } from 'react'
import { usePersonaStore } from '@/src/store/personaStore'

describe('personaStore', () => {
  beforeEach(() => {
    usePersonaStore.setState({ persona: 'athlete' })
  })

  it('defaults to athlete', () => {
    expect(usePersonaStore.getState().persona).toBe('athlete')
  })

  it('setPersona switches to wellness', () => {
    act(() => {
      usePersonaStore.getState().setPersona('wellness')
    })
    expect(usePersonaStore.getState().persona).toBe('wellness')
  })

  it('setPersona switches back to athlete', () => {
    usePersonaStore.setState({ persona: 'wellness' })
    act(() => {
      usePersonaStore.getState().setPersona('athlete')
    })
    expect(usePersonaStore.getState().persona).toBe('athlete')
  })
})
