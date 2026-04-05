/**
 * Lightweight checks for Open-Meteo `latest.json` map tile metadata (used in tests and hooks).
 */

export type OpenMeteoValidTimesCheck =
  | { ok: true; count: number }
  | { ok: false; reason: string }

export function validateOpenMeteoValidTimesPayload(json: unknown): OpenMeteoValidTimesCheck {
  if (json === null || typeof json !== 'object') {
    return { ok: false, reason: 'payload is not an object' }
  }
  const vt = (json as { valid_times?: unknown }).valid_times
  if (!Array.isArray(vt)) {
    return { ok: false, reason: 'valid_times is missing or not an array' }
  }
  if (vt.length === 0) {
    return { ok: false, reason: 'valid_times is empty' }
  }
  return { ok: true, count: vt.length }
}
