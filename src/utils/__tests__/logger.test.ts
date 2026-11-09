import { logger } from '@/src/utils/logger'

describe('logger', () => {
  it('logs structured messages for info and error contexts', () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined)
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    logger.info('weather.api', { lat: 43.7, lon: -79.4 })
    logger.error('weather.api', new Error('bad network'), { lat: 43.7, lon: -79.4 })

    expect(infoSpy).toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalled()
    expect(infoSpy.mock.calls[0][0]).toBe('[weather.api]')
    expect(String(errorSpy.mock.calls[0][0])).toContain('[weather.api]')

    infoSpy.mockRestore()
    errorSpy.mockRestore()
  })
})
