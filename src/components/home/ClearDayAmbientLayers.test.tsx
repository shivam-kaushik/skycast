import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import ClearDayAmbientLayers from '@/src/components/home/ClearDayAmbientLayers'

describe('ClearDayAmbientLayers', () => {
  it('renders clear and partly variants', async () => {
    let a!: TestRenderer.ReactTestRenderer
    await act(async () => {
      a = TestRenderer.create(<ClearDayAmbientLayers variant="clear" />)
    })
    expect(a.toJSON()).toBeTruthy()
    await act(async () => { a.unmount() })

    let b!: TestRenderer.ReactTestRenderer
    await act(async () => {
      b = TestRenderer.create(<ClearDayAmbientLayers variant="partly" />)
    })
    expect(b.toJSON()).toBeTruthy()
    await act(async () => { b.unmount() })
  })
})
