export const MIN_PASSWORD_LENGTH = 8

/** Validate a new password + its confirmation. Returns a message to show, or `null` when valid. */
export function validateNewPassword(password: string, confirmation: string): string | null {
  if (!password) return 'Please fill in all fields.'
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  if (password !== confirmation) return 'Passwords do not match.'
  return null
}
