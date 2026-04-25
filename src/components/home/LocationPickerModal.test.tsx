import React from 'react'
import renderer, { act } from 'react-test-renderer'
import LocationPickerModal from '@/src/components/home/LocationPickerModal'

describe('LocationPickerModal', () => {
  it('renders without crashing', async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(
        <LocationPickerModal
          visible={true}
          deviceCityName="Toronto"
          savedLocations={[]}
          recentLocationIds={[]}
          onClose={() => {}}
          onUseDeviceLocation={() => {}}
          onSelectLocation={() => {}}
          onToggleFavorite={() => {}}
        />,
      )
    })
    expect(tree.toJSON()).toBeTruthy()
  })
})
