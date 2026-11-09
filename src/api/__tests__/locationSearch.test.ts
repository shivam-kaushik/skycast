import { searchLocations } from '@/src/api/locationSearch'

const mockFetch = jest.fn()
const originalFetch = global.fetch

type Responder = () => { ok: boolean; status?: number; body?: unknown }

/** Route by provider host; unlisted hosts fail the test loudly. */
function routeProviders(routes: { openMeteo?: Responder; mapsCo?: Responder; photon?: Responder }): void {
  mockFetch.mockImplementation(async (url: string) => {
    const responder = url.includes('geocoding-api.open-meteo.com')
      ? routes.openMeteo
      : url.includes('geocode.maps.co')
        ? routes.mapsCo
        : url.includes('photon.komoot.io')
          ? routes.photon
          : undefined
    if (!responder) throw new Error(`unexpected request: ${url}`)
    const { ok, status = ok ? 200 : 500, body } = responder()
    return { ok, status, json: async () => body }
  })
}

const calledHosts = (): string[] => mockFetch.mock.calls.map((c) => new URL(c[0] as string).host)

describe('searchLocations', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch as unknown as typeof fetch
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('returns [] without any request for queries shorter than 2 characters', async () => {
    await expect(searchLocations('a')).resolves.toEqual([])
    await expect(searchLocations('  ')).resolves.toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  describe('Open-Meteo (primary)', () => {
    it('trims and URL-encodes the query', async () => {
      routeProviders({ openMeteo: () => ({ ok: true, body: { results: [] } }), mapsCo: () => ({ ok: true, body: [] }), photon: () => ({ ok: true, body: { features: [] } }) })

      await searchLocations('  São Paulo  ')

      expect(mockFetch.mock.calls[0]?.[0]).toBe(
        'https://geocoding-api.open-meteo.com/v1/search?name=S%C3%A3o%20Paulo&count=10&language=en&format=json',
      )
    })

    it('maps valid results, drops malformed ones, and never calls fallbacks', async () => {
      routeProviders({
        openMeteo: () => ({
          ok: true,
          body: {
            results: [
              { id: 6167865, name: 'Toronto', latitude: 43.7, longitude: -79.4, country: 'Canada', admin1: 'Ontario' },
              { name: 'NoCoords' },
              { latitude: 1, longitude: 2 },
              { name: 'NoId', latitude: 10.5, longitude: 20.25 },
            ],
          },
        }),
      })

      const results = await searchLocations('toronto')

      expect(results).toEqual([
        { id: '6167865', cityName: 'Toronto', lat: 43.7, lon: -79.4, country: 'Canada', admin1: 'Ontario' },
        { id: 'NoId-10.5-20.25', cityName: 'NoId', lat: 10.5, lon: 20.25, country: undefined, admin1: undefined },
      ])
      expect(calledHosts()).toEqual(['geocoding-api.open-meteo.com'])
    })

    it('dedupes entries with the same name (case-insensitive) and coordinates to 3 decimals', async () => {
      routeProviders({
        openMeteo: () => ({
          ok: true,
          body: {
            results: [
              { id: 1, name: 'Paris', latitude: 48.85661, longitude: 2.35222 },
              { id: 2, name: 'PARIS', latitude: 48.85664, longitude: 2.35224 },
              { id: 3, name: 'Paris', latitude: 33.66, longitude: -95.55 },
            ],
          },
        }),
      })

      const results = await searchLocations('paris')

      expect(results.map((r) => r.id)).toEqual(['1', '3'])
    })
  })

  describe('Maps.co (first fallback)', () => {
    it('is used when the primary returns no results', async () => {
      routeProviders({
        openMeteo: () => ({ ok: true, body: { results: [] } }),
        mapsCo: () => ({
          ok: true,
          body: [{ display_name: 'Paris, Île-de-France, Metropolitan France, France', lat: '48.8566', lon: '2.3522' }],
        }),
      })

      const results = await searchLocations('paris')

      expect(results).toEqual([
        {
          id: 'mapsco-Paris-48.8566-2.3522',
          cityName: 'Paris',
          lat: 48.8566,
          lon: 2.3522,
          country: 'France',
          admin1: 'Île-de-France',
        },
      ])
    })

    it('is used when the primary request fails', async () => {
      routeProviders({
        openMeteo: () => ({ ok: false, status: 503 }),
        mapsCo: () => ({ ok: true, body: [{ display_name: 'Oslo, Norway', lat: '59.91', lon: '10.75' }] }),
      })

      const results = await searchLocations('oslo')

      expect(results).toHaveLength(1)
      // two-part names have no admin1
      expect(results[0]).toMatchObject({ cityName: 'Oslo', country: 'Norway', admin1: undefined })
    })

    it('drops rows with non-numeric coordinates or a blank display name', async () => {
      routeProviders({
        openMeteo: () => ({ ok: true, body: { results: [] } }),
        mapsCo: () => ({
          ok: true,
          body: [
            { display_name: 'Bad, Nowhere', lat: 'abc', lon: '1' },
            { display_name: '   ', lat: '1', lon: '2' },
            { lat: '1', lon: '2' },
            { display_name: 'Good, Somewhere', lat: '1', lon: '2' },
          ],
        }),
      })

      const results = await searchLocations('somewhere')

      expect(results.map((r) => r.cityName)).toEqual(['Good'])
    })

    it('treats a non-array response as no results and moves on to Photon', async () => {
      routeProviders({
        openMeteo: () => ({ ok: true, body: {} }),
        mapsCo: () => ({ ok: true, body: { error: 'rate limited' } }),
        photon: () => ({ ok: true, body: { features: [] } }),
      })

      await expect(searchLocations('xx')).resolves.toEqual([])
      expect(calledHosts()).toEqual(['geocoding-api.open-meteo.com', 'geocode.maps.co', 'photon.komoot.io'])
    })
  })

  describe('Photon (last fallback)', () => {
    const failingUpstream = {
      openMeteo: (): ReturnType<Responder> => ({ ok: false }),
      mapsCo: (): ReturnType<Responder> => ({ ok: false }),
    }

    it('maps [lon, lat] coordinates, falling back from name to city, and indexes ids', async () => {
      routeProviders({
        ...failingUpstream,
        photon: () => ({
          ok: true,
          body: {
            features: [
              { geometry: { coordinates: [-0.1276, 51.5072] }, properties: { name: 'London', state: 'England', country: 'United Kingdom' } },
              { geometry: { coordinates: [11.5, 48.1] }, properties: { city: 'Munich', country: 'Germany' } },
            ],
          },
        }),
      })

      const results = await searchLocations('lon')

      expect(results).toEqual([
        { id: 'photon-London-51.5072--0.1276-0', cityName: 'London', lat: 51.5072, lon: -0.1276, country: 'United Kingdom', admin1: 'England' },
        { id: 'photon-Munich-48.1-11.5-1', cityName: 'Munich', lat: 48.1, lon: 11.5, country: 'Germany', admin1: undefined },
      ])
    })

    it('skips features with missing/short coordinates, non-finite values, or no usable name', async () => {
      routeProviders({
        ...failingUpstream,
        photon: () => ({
          ok: true,
          body: {
            features: [
              { properties: { name: 'NoGeometry' } },
              { geometry: { coordinates: [1] }, properties: { name: 'Short' } },
              { geometry: { coordinates: ['x', 'y'] }, properties: { name: 'NaN' } },
              { geometry: { coordinates: [1, 2] }, properties: {} },
              { geometry: { coordinates: [3, 4] }, properties: { name: 'Keeper' } },
            ],
          },
        }),
      })

      const results = await searchLocations('keeper')

      expect(results.map((r) => r.cityName)).toEqual(['Keeper'])
    })

    it('rejects when every provider fails, surfacing the last provider error', async () => {
      routeProviders({ ...failingUpstream, photon: () => ({ ok: false, status: 500 }) })

      await expect(searchLocations('anywhere')).rejects.toThrow('Photon search failed (500)')
    })
  })
})
