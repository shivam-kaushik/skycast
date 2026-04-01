import type { AirQualityData, CurrentWeather } from '@/src/types/weather'
import { describeAQI, describePollenLevel, describeUV } from '@/src/utils/weatherDescriptions'

const POLLEN_KEYS = [
  'grassPollen',
  'birchPollen',
  'ragweedPollen',
  'alderPollen',
  'olivePollen',
  'mugwortPollen',
] as const satisfies readonly (keyof AirQualityData['hourly'])[]

/** Match air screen hour index logic. */
export function airQualityHourIndex(hourlyTimes: string[]): number {
  const now = new Date()
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:`
  const idx = hourlyTimes.findIndex((t) => t >= prefix)
  return idx === -1 ? 0 : idx
}

export function maxPollenLevelAtHour(
  hourly: AirQualityData['hourly'],
  hourIdx: number,
): 'unavailable' | ReturnType<typeof describePollenLevel> {
  let hasNumeric = false
  let maxGrains = 0
  for (const key of POLLEN_KEYS) {
    const v = hourly[key][hourIdx]
    if (v !== null && v !== undefined && !Number.isNaN(v)) {
      hasNumeric = true
      maxGrains = Math.max(maxGrains, v)
    }
  }
  if (!hasNumeric) return 'unavailable'
  return describePollenLevel(maxGrains)
}

const DISCLAIMER =
  'General wellness tips only — not medical advice.'

/**
 * Plain-language correlations between conditions and how people tend to feel outdoors.
 */
export function buildHealthInsights(
  current: CurrentWeather,
  air: AirQualityData['current'] | null,
  pollenSummary: 'unavailable' | ReturnType<typeof describePollenLevel>,
): string[] {
  const lines: string[] = []

  if (air !== null && air.usAqi > 50) {
    lines.push(describeAQI(air.usAqi).advice)
  }

  if (pollenSummary !== 'unavailable' && pollenSummary !== 'None' && pollenSummary !== 'Low') {
    lines.push(
      `Pollen is ${pollenSummary.toLowerCase()}. People with allergies may want to limit long outdoor blocks when counts are highest.`,
    )
  }

  if (current.uvIndex >= 6) {
    lines.push(describeUV(current.uvIndex))
  }

  if (current.humidity > 80 && current.temperature >= 24) {
    lines.push(
      'Sticky heat and humidity can make breathing and exercise feel harder — pace yourself and hydrate.',
    )
  }

  if (current.windGusts >= 45) {
    lines.push('Strong gusts can irritate eyes and dry airways — eye protection helps on windy days.')
  }

  if (lines.length === 0) {
    lines.push(`Conditions look comfortable for most people outdoors. ${DISCLAIMER}`)
  } else {
    lines.push(DISCLAIMER)
  }

  return lines
}
