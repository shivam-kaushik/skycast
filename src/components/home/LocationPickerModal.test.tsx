import React from 'react'
import renderer from 'react-test-renderer'
import LocationPickerModal from '@/src/components/home/LocationPickerModal'

describe('LocationPickerModal', () => {
  it('renders without crashing', () => {
    const tree = renderer
      .create(
        <LocationPickerModal
          visible={false}
          deviceCityName="Toronto"
          savedLocations={[]}
          recentLocationIds={[]}
          onClose={() => {}}
          onUseDeviceLocation={() => {}}
          onSelectLocation={() => {}}
          onToggleFavorite={() => {}}
        />,
      )
      .toJSON()

    expect(tree).toBeTruthy()
  })
})
