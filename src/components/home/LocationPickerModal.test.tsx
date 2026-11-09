import React from 'react'
import { Text } from 'react-native'
import renderer, { act } from 'react-test-renderer'
import LocationPickerModal from '@/src/components/home/LocationPickerModal'
import type { LocationSearchResult } from '@/src/api/locationSearch'
import type { SavedLocation } from '@/src/store/locationStore'
import { deferred } from '@/src/utils/testFixtures'
import { allText, hasText, pressByTestId, pressText, submitInput, typeInto } from '@/src/utils/testScreenHelpers'

// First render is slow under parallel workers; 5s is too tight.
jest.setTimeout(30_000)

jest.mock('@/src/api/locationSearch', () => ({ searchLocations: jest.fn() }))

const { searchLocations } = jest.requireMock('@/src/api/locationSearch') as { searchLocations: jest.Mock }

const SEARCH = 'Search city or place'

function saved(overrides: Partial<SavedLocation> & { id: string; cityName: string }): SavedLocation {
  return { lat: 1, lon: 2, isFavorite: false, lastSelectedAt: 0, ...overrides }
}

const PARIS = saved({ id: 'paris', cityName: 'Paris', admin1: 'Île-de-France', country: 'France', lat: 48.85, lon: 2.35, isFavorite: true })
const OSLO = saved({ id: 'oslo', cityName: 'Oslo', isFavorite: false })
const LIMA = saved({ id: 'lima', cityName: 'Lima', country: 'Peru', isFavorite: true })

const onClose = jest.fn()
const onUseDeviceLocation = jest.fn()
const onSelectLocation = jest.fn()
const onToggleFavorite = jest.fn()
let trees: renderer.ReactTestRenderer[] = []

interface Props {
  visible?: boolean
  deviceCityName?: string
  savedLocations?: SavedLocation[]
  recentLocationIds?: string[]
}

function element({ visible = true, deviceCityName = 'Toronto', savedLocations = [], recentLocationIds = [] }: Props = {}) {
  return (
    <LocationPickerModal
      visible={visible}
      deviceCityName={deviceCityName}
      savedLocations={savedLocations}
      recentLocationIds={recentLocationIds}
      onClose={onClose}
      onUseDeviceLocation={onUseDeviceLocation}
      onSelectLocation={onSelectLocation}
      onToggleFavorite={onToggleFavorite}
    />
  )
}

async function render(props: Props = {}): Promise<renderer.ReactTestRenderer> {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(element(props))
  })
  trees.push(tree)
  return tree
}

/** Type a query and search immediately (skips the debounce). */
async function searchFor(tree: renderer.ReactTestRenderer, query: string): Promise<void> {
  typeInto(tree, SEARCH, query)
  await submitInput(tree, SEARCH)
}

/** Text of a <Text> node; an icon renders as a single glyph character. */
function labelOf(node: renderer.ReactTestInstance): string {
  return [node.props.children].flat(Infinity).filter((c): c is string => typeof c === 'string').join('')
}

/** Icon-only star buttons: pressables containing a star icon and no label text (only the 1-char glyph). */
function starButtons(tree: renderer.ReactTestRenderer) {
  return tree.root.findAll(
    (n) =>
      typeof n.props.onPress === 'function' &&
      n.findAll((c) => c.props.name === 'star' || c.props.name === 'star-outline').length > 0 &&
      n.findAllByType(Text).every((t) => labelOf(t).length <= 1),
  )
}

const RESULT: LocationSearchResult = { id: 'r1', cityName: 'Berlin', lat: 52.5, lon: 13.4, country: 'Germany', admin1: 'Berlin State' }

beforeEach(() => {
  ;[onClose, onUseDeviceLocation, onSelectLocation, onToggleFavorite, searchLocations].forEach((fn) => fn.mockReset())
  searchLocations.mockResolvedValue([])
})

afterEach(() => {
  act(() => {
    trees.forEach((t) => t.unmount())
  })
  trees = []
  jest.useRealTimers()
})

describe('LocationPickerModal — chrome', () => {
  it('renders without crashing', async () => {
    const tree = await render()
    expect(tree.toJSON()).toBeTruthy()
  })

  it('shows nothing when hidden', async () => {
    const tree = await render({ visible: false })
    expect(hasText(tree, 'Locations')).toBe(false)
  })

  it('shows the title and closes from the close button', async () => {
    const tree = await render()
    expect(hasText(tree, 'Locations')).toBe(true)

    await pressByTestId(tree, 'location-picker-close')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('offers the device location, naming the last GPS place', async () => {
    const tree = await render({ deviceCityName: 'Toronto' })

    expect(hasText(tree, 'Use current location')).toBe(true)
    expect(hasText(tree, 'Toronto')).toBe(true)
  })

  it('falls back to a generic label when no GPS place is known', async () => {
    const tree = await render({ deviceCityName: '   ' })
    expect(hasText(tree, 'Your GPS location')).toBe(true)
  })

  it('switches to the device location and closes', async () => {
    const tree = await render()

    await pressText(tree, 'Use current location')

    expect(onUseDeviceLocation).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('LocationPickerModal — favorites and recents', () => {
  it('shows hints when there are no favorites or recents', async () => {
    const tree = await render()

    expect(hasText(tree, 'Favorites')).toBe(true)
    expect(hasText(tree, 'Star locations from search or history')).toBe(true)
    expect(hasText(tree, 'Recent')).toBe(true)
    expect(hasText(tree, 'No recent locations yet')).toBe(true)
  })

  it('lists only favorited locations under Favorites', async () => {
    const tree = await render({ savedLocations: [PARIS, OSLO, LIMA] })

    expect(hasText(tree, 'Paris')).toBe(true)
    expect(hasText(tree, 'Lima')).toBe(true)
    expect(hasText(tree, 'Oslo')).toBe(false)
    expect(hasText(tree, 'Star locations from search or history')).toBe(false)
  })

  it('describes a favorite by region and country, falling back to "Favorite"', async () => {
    const tree = await render({ savedLocations: [PARIS, saved({ id: 'x', cityName: 'Nowhere', isFavorite: true })] })

    expect(hasText(tree, 'Île-de-France, France')).toBe(true)
    expect(hasText(tree, 'Favorite')).toBe(true)
  })

  it('selects a favorite as a plain search result and closes', async () => {
    const tree = await render({ savedLocations: [PARIS] })

    await pressText(tree, 'Paris')

    expect(onSelectLocation).toHaveBeenCalledWith({
      id: 'paris', cityName: 'Paris', lat: 48.85, lon: 2.35, country: 'France', admin1: 'Île-de-France',
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('toggles a favorite from its star button without selecting the location', async () => {
    const tree = await render({ savedLocations: [PARIS] })
    const stars = starButtons(tree)
    expect(stars).toHaveLength(1)

    act(() => {
      stars[0]?.props.onPress()
    })

    expect(onToggleFavorite).toHaveBeenCalledWith('paris')
    expect(onSelectLocation).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('lists recents in the given order and skips ids that are no longer saved', async () => {
    const tree = await render({ savedLocations: [OSLO, LIMA], recentLocationIds: ['lima', 'ghost', 'oslo'] })

    // Lima is also a favorite, so it appears once under Favorites and then first under Recent.
    expect(allText(tree).filter((t) => t === 'Lima' || t === 'Oslo')).toEqual(['Lima', 'Lima', 'Oslo'])
    expect(hasText(tree, 'ghost')).toBe(false)
    expect(hasText(tree, 'No recent locations yet')).toBe(false)
  })

  it('toggles a recent location from its star button', async () => {
    const tree = await render({ savedLocations: [OSLO], recentLocationIds: ['oslo'] })
    const stars = starButtons(tree)
    expect(stars).toHaveLength(1)

    act(() => {
      stars[0]?.props.onPress()
    })

    expect(onToggleFavorite).toHaveBeenCalledWith('oslo')
    expect(onSelectLocation).not.toHaveBeenCalled()
  })

  it('describes a recent location, falling back to "Recent location"', async () => {
    const tree = await render({ savedLocations: [OSLO, LIMA], recentLocationIds: ['oslo', 'lima'] })

    expect(hasText(tree, 'Recent location')).toBe(true) // Oslo has no region/country
    expect(hasText(tree, 'Peru')).toBe(true)
  })

  it('selects a recent location and closes', async () => {
    const tree = await render({ savedLocations: [OSLO], recentLocationIds: ['oslo'] })

    await pressText(tree, 'Oslo')

    expect(onSelectLocation).toHaveBeenCalledWith(expect.objectContaining({ id: 'oslo', cityName: 'Oslo' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('LocationPickerModal — search', () => {
  it('asks for at least two letters and does not search for one', async () => {
    const tree = await render()

    await searchFor(tree, 'a')

    expect(hasText(tree, 'Type at least 2 letters')).toBe(true)
    expect(searchLocations).not.toHaveBeenCalled()
  })

  it('does not search for whitespace-only input', async () => {
    const tree = await render()

    await searchFor(tree, '     ')

    expect(searchLocations).not.toHaveBeenCalled()
    expect(hasText(tree, 'Type at least 2 letters')).toBe(false)
  })

  it('searches with the trimmed query and replaces favorites/recents with the results', async () => {
    searchLocations.mockResolvedValue([RESULT])
    const tree = await render({ savedLocations: [PARIS] })

    await searchFor(tree, '  Berlin ')

    expect(searchLocations).toHaveBeenCalledWith('Berlin')
    expect(hasText(tree, 'Search Results')).toBe(true)
    expect(hasText(tree, 'Berlin')).toBe(true)
    expect(hasText(tree, 'Berlin State, Germany')).toBe(true)
    expect(hasText(tree, 'Favorites')).toBe(false)
    expect(hasText(tree, 'Recent')).toBe(false)
  })

  it('shows a searching indicator until results arrive', async () => {
    const pending = deferred<LocationSearchResult[]>()
    searchLocations.mockReturnValue(pending.promise)
    const tree = await render()

    await searchFor(tree, 'Ber')
    expect(hasText(tree, 'Searching…')).toBe(true)

    await act(async () => {
      pending.resolve([RESULT])
    })
    expect(hasText(tree, 'Searching…')).toBe(false)
    expect(hasText(tree, 'Berlin')).toBe(true)
  })

  it('describes a result without region or country as a saved location', async () => {
    searchLocations.mockResolvedValue([{ id: 'r2', cityName: 'Atlantis', lat: 0, lon: 0 }])
    const tree = await render()

    await searchFor(tree, 'Atl')

    expect(hasText(tree, 'Saved location')).toBe(true)
  })

  it('selects a result and closes', async () => {
    searchLocations.mockResolvedValue([RESULT])
    const tree = await render()
    await searchFor(tree, 'Ber')

    await pressText(tree, 'Berlin')

    expect(onSelectLocation).toHaveBeenCalledWith(RESULT)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('reports when nothing matches', async () => {
    const tree = await render()

    await searchFor(tree, 'Zzzz')

    expect(hasText(tree, 'No matching locations found for "Zzzz"')).toBe(true)
  })

  it('shows the error message when the search fails', async () => {
    searchLocations.mockRejectedValue(new Error('Photon search failed (500)'))
    const tree = await render()

    await searchFor(tree, 'Ber')

    expect(hasText(tree, 'Photon search failed (500)')).toBe(true)
    expect(hasText(tree, 'No matching locations found for "Ber"')).toBe(false)
  })

  it('uses a generic message for non-Error failures', async () => {
    searchLocations.mockRejectedValue('nope')
    const tree = await render()

    await searchFor(tree, 'Ber')

    expect(hasText(tree, 'Unable to search right now')).toBe(true)
  })

  it('ignores a slow earlier response that arrives after a newer search', async () => {
    const slow = deferred<LocationSearchResult[]>()
    const fast = deferred<LocationSearchResult[]>()
    searchLocations.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)
    const tree = await render()

    await searchFor(tree, 'Old')
    await searchFor(tree, 'New')
    await act(async () => {
      fast.resolve([{ id: 'n', cityName: 'Newtown', lat: 1, lon: 1 }])
    })
    await act(async () => {
      slow.resolve([{ id: 'o', cityName: 'Oldtown', lat: 2, lon: 2 }])
    })

    expect(hasText(tree, 'Newtown')).toBe(true)
    expect(hasText(tree, 'Oldtown')).toBe(false)
    expect(hasText(tree, 'Searching…')).toBe(false)
  })

  it('searches automatically 300ms after typing stops, using only the final query', async () => {
    jest.useFakeTimers({
      // Only setTimeout is faked so act()/promises keep working.
      doNotFake: ['setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'],
    })
    searchLocations.mockResolvedValue([RESULT])
    const tree = await render()

    typeInto(tree, SEARCH, 'Be')
    typeInto(tree, SEARCH, 'Ber')
    typeInto(tree, SEARCH, 'Berl')
    await act(async () => {
      jest.advanceTimersByTime(299)
    })
    expect(searchLocations).not.toHaveBeenCalled()

    await act(async () => {
      jest.advanceTimersByTime(1)
    })

    expect(searchLocations).toHaveBeenCalledTimes(1)
    expect(searchLocations).toHaveBeenCalledWith('Berl')
  })

  it('resets the search when the picker is closed and reopened', async () => {
    searchLocations.mockResolvedValue([RESULT])
    const tree = await render({ savedLocations: [PARIS] })
    await searchFor(tree, 'Ber')
    expect(hasText(tree, 'Search Results')).toBe(true)

    await act(async () => {
      tree.update(element({ visible: false, savedLocations: [PARIS] }))
    })
    await act(async () => {
      tree.update(element({ visible: true, savedLocations: [PARIS] }))
    })

    expect(tree.root.findAll((n) => n.props.placeholder === SEARCH && typeof n.props.onChangeText === 'function')[0]?.props.value).toBe('')
    expect(hasText(tree, 'Search Results')).toBe(false)
    expect(hasText(tree, 'Favorites')).toBe(true)
  })
})
