import { usePrefsStore } from '../prefsStore'

beforeEach(() => {
  usePrefsStore.setState({
    unit: 'C',
    rainThreshold: 60,
    windThreshold: 50,
    uvThreshold: 7,
    alertsEnabled: { rain: true, uv: true, wind: true, pollen: true, severe: true },
  })
})

describe('prefsStore', () => {
  it('toggles unit between C and F', () => {
    usePrefsStore.getState().setUnit('F')
    expect(usePrefsStore.getState().unit).toBe('F')
    usePrefsStore.getState().setUnit('C')
    expect(usePrefsStore.getState().unit).toBe('C')
  })

  it('sets rainThreshold via setThreshold', () => {
    usePrefsStore.getState().setThreshold('rainThreshold', 80)
    expect(usePrefsStore.getState().rainThreshold).toBe(80)
  })

  it('sets windThreshold via setThreshold', () => {
    usePrefsStore.getState().setThreshold('windThreshold', 75)
    expect(usePrefsStore.getState().windThreshold).toBe(75)
  })

  it('toggles alert off then on', () => {
    usePrefsStore.getState().toggleAlert('rain')
    expect(usePrefsStore.getState().alertsEnabled.rain).toBe(false)
    usePrefsStore.getState().toggleAlert('rain')
    expect(usePrefsStore.getState().alertsEnabled.rain).toBe(true)
  })

  it('toggles severe alert independently', () => {
    usePrefsStore.getState().toggleAlert('severe')
    expect(usePrefsStore.getState().alertsEnabled.severe).toBe(false)
    expect(usePrefsStore.getState().alertsEnabled.uv).toBe(true)
  })
})
