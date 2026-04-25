import type { AirQualityData, AllergyRiskData } from '@/src/types/weather'
import { describePollenLevel } from '@/src/utils/weatherDescriptions'

const POLLEN_SCORE: Record<ReturnType<typeof describePollenLevel>, number> = {
  None: 0,
  Low: 1,
  Moderate: 2,
  High: 3,
  'Very High': 4,
}

type AllergenKey = keyof Pick<
  AirQualityData['hourly'],
  'alderPollen' | 'birchPollen' | 'grassPollen' | 'mugwortPollen' | 'olivePollen' | 'ragweedPollen'
>

const ALLERGEN_NAMES: Record<AllergenKey, string> = {
  alderPollen: 'Alder',
  birchPollen: 'Birch',
  grassPollen: 'Grass',
  mugwortPollen: 'Mugwort',
  olivePollen: 'Olive',
  ragweedPollen: 'Ragweed',
}

const ALLERGEN_KEYS: AllergenKey[] = [
  'alderPollen',
  'birchPollen',
  'grassPollen',
  'mugwortPollen',
  'olivePollen',
  'ragweedPollen',
]

export function computeAllergyRisk(
  hourly: AirQualityData['hourly'],
  currentHourIdx: number,
  humidity: number,
  windSpeed: number,
): AllergyRiskData {
  let maxScore = 0
  let dominantAllergen: string | null = null

  for (const key of ALLERGEN_KEYS) {
    const val = hourly[key][currentHourIdx] ?? null
    const level = describePollenLevel(val)
    const score = POLLEN_SCORE[level]
    if (score > maxScore) {
      maxScore = score
      dominantAllergen = ALLERGEN_NAMES[key]
    }
  }

  const humidityMultiplier = humidity > 70 ? 1.3 : 1.0
  const windPenalty = windSpeed > 20 ? -0.5 : 0
  const raw = maxScore * humidityMultiplier + windPenalty

  let label: AllergyRiskData['label']
  if (raw < 1) label = 'Low'
  else if (raw < 2) label = 'Moderate'
  else if (raw < 3) label = 'High'
  else label = 'Very High'

  return { label, score: raw, dominantAllergen: maxScore === 0 ? null : dominantAllergen }
}
