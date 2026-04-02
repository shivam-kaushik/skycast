import type { AmbientVisualKind } from '@/src/utils/ambientWeatherKind'
import { BG } from '@/src/theme/colors'

/**
 * Scrim over the animated sky so text/cards stay readable.
 * Hero stays lighter than before so cloud/sun/rain motion stays visible (first-party weather apps
 * rely on full-bleed bright sky + UI contrast from typography, not crushing the whole stack).
 */
export function homeScrimGradient(kind: AmbientVisualKind): {
  colors: [string, string, string, string]
  locations: [number, number, number, number]
} {
  switch (kind) {
    case 'rain':
    case 'thunder':
      return {
        colors: ['rgba(14,19,34,0.22)', 'rgba(14,19,34,0.52)', 'rgba(14,19,34,0.88)', BG],
        locations: [0, 0.34, 0.68, 1],
      }
    case 'clearNight':
      return {
        colors: ['rgba(14,19,34,0.2)', 'rgba(14,19,34,0.48)', 'rgba(14,19,34,0.82)', BG],
        locations: [0, 0.38, 0.74, 1],
      }
    case 'snow':
    case 'fog':
      return {
        colors: ['rgba(14,19,34,0.1)', 'rgba(14,19,34,0.32)', 'rgba(14,19,34,0.72)', BG],
        locations: [0, 0.32, 0.66, 1],
      }
    case 'cloudy':
    case 'partlyCloudyDay':
    case 'partlyCloudyNight':
      // Light top scrim so falling rain / stratus bands stay visible (not mud-gray).
      return {
        colors: ['rgba(14,19,34,0.02)', 'rgba(14,19,34,0.12)', 'rgba(14,19,34,0.42)', BG],
        locations: [0, 0.28, 0.62, 1],
      }
    default:
      return {
        colors: ['rgba(14,19,34,0.03)', 'rgba(14,19,34,0.18)', 'rgba(14,19,34,0.52)', BG],
        locations: [0, 0.28, 0.62, 1],
      }
  }
}
