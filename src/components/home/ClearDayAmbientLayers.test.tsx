import React from 'react'
import TestRenderer from 'react-test-renderer'
import ClearDayAmbientLayers from '@/src/components/home/ClearDayAmbientLayers'

describe('ClearDayAmbientLayers', () => {
  it('renders clear and partly variants', () => {
    const a = TestRenderer.create(<ClearDayAmbientLayers variant="clear" />)
    expect(a.toJSON()).toBeTruthy()
    a.unmount()
    const b = TestRenderer.create(<ClearDayAmbientLayers variant="partly" />)
    expect(b.toJSON()).toBeTruthy()
    b.unmount()
  })
})
