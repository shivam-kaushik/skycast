import { MIN_PASSWORD_LENGTH, validateNewPassword } from '@/src/utils/passwordRules'

describe('validateNewPassword', () => {
  it('requires a password', () => {
    expect(validateNewPassword('', '')).toBe('Please fill in all fields.')
  })

  it(`requires at least ${MIN_PASSWORD_LENGTH} characters`, () => {
    expect(validateNewPassword('1234567', '1234567')).toBe('Password must be at least 8 characters.')
  })

  it('accepts exactly the minimum length', () => {
    expect(validateNewPassword('12345678', '12345678')).toBeNull()
  })

  it('requires the confirmation to match', () => {
    expect(validateNewPassword('password1', 'password2')).toBe('Passwords do not match.')
  })

  it('treats an empty confirmation as a mismatch', () => {
    expect(validateNewPassword('password1', '')).toBe('Passwords do not match.')
  })

  it('reports the length problem before a mismatch', () => {
    expect(validateNewPassword('short', 'other')).toBe('Password must be at least 8 characters.')
  })

  it('does not trim: spaces count as characters', () => {
    expect(validateNewPassword('       a', '       a')).toBeNull()
  })
})
