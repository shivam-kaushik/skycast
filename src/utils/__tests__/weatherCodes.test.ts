import { getWeatherCodeInfo } from '@/src/utils/weatherCodes'
import weatherCodeMap from '@/src/utils/weatherCodes'

describe('getWeatherCodeInfo', () => {
  it('returns the correct label and icon for known WMO codes', () => {
    expect(getWeatherCodeInfo(0)).toEqual({ label: 'Clear Sky', ionicon: 'sunny' })
    expect(getWeatherCodeInfo(61)).toEqual({ label: 'Slight Rain', ionicon: 'rainy' })
    expect(getWeatherCodeInfo(95)).toEqual({ label: 'Thunderstorm', ionicon: 'thunderstorm' })
    expect(getWeatherCodeInfo(71)).toEqual({ label: 'Slight Snow', ionicon: 'snow' })
  })

  it('falls back to Unknown/cloudy for an unmapped code', () => {
    expect(getWeatherCodeInfo(999)).toEqual({ label: 'Unknown', ionicon: 'cloudy' })
  })

  it('exports the raw map with entries for every documented WMO code', () => {
    const codes = [0, 1, 2, 3, 45, 48, 51, 53, 55, 61, 63, 65, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]
    for (const code of codes) {
      expect(weatherCodeMap[code]).toBeDefined()
    }
  })
})
