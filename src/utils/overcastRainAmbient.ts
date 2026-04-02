/** Min combined precip % before overcast background shows rain (not dry gray sky). */
export const OVERCAST_RAIN_MIN_PCT = 20

/**
 * Opacity for overcast “rain soon” layer from max(current, hourly peak) precip probability.
 * Returns 0 when below threshold.
 */
export function rainOpacityForOvercast(precipSignal: number): number {
  if (precipSignal < OVERCAST_RAIN_MIN_PCT) return 0
  const t = (precipSignal - OVERCAST_RAIN_MIN_PCT) / (100 - OVERCAST_RAIN_MIN_PCT)
  return Math.min(0.96, 0.22 + t * 0.74)
}
