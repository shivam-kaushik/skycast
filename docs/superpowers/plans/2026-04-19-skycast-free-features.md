# Skycast Differentiators — Free Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all free-tier features from the Skycast Differentiators spec: persona switcher, rain probability bar, safety alerts, Sky tab (moon/lunar/rainbow/sunset/stargazing/golden hour), Air tab additions (allergy risk index, pollen trend chart), and pressure headache alerts in the More screen.

**Architecture:** Pure utility functions compute sky phenomena, allergy risk, and pressure alert scores. Custom hooks (useMemo / React Query) wrap these and expose typed data to screens. Components render using existing GlassCard + design tokens. Home/Air/More tabs are extended; a new Sky tab replaces the hidden `two` tab at position 4.

**Tech Stack:** `suncalc` + `@types/suncalc` (lunar/solar math), `react-native-svg` (already installed, pollen chart), `zustand` persist (persona store), `@tanstack/react-query` (NWS alerts), NWS free API, Open-Meteo `surface_pressure` hourly field.

---

## File Map

| Action | Path |
|--------|------|
| Install | `suncalc`, `@types/suncalc`, `openai` |
| Modify | `src/types/weather.ts` — add `surfacePressure` + 5 new interfaces |
| Modify | `src/api/openMeteo.ts` — add `surface_pressure` to hourly |
| Create | `src/store/personaStore.ts` |
| Create | `src/utils/skyPhenomena.ts` |
| Create | `src/utils/allergyRisk.ts` |
| Create | `src/utils/pressureAlert.ts` |
| Create | `src/hooks/useLunar.ts` |
| Create | `src/hooks/useSkyPhenomena.ts` |
| Create | `src/hooks/useRainBar.ts` |
| Create | `src/hooks/usePressureAlert.ts` |
| Create | `src/hooks/useWeatherAlerts.ts` |
| Create | `src/components/home/PersonaSwitcher.tsx` + `.test.tsx` |
| Create | `src/components/home/RainProbabilityBar.tsx` + `.test.tsx` |
| Create | `src/components/home/PersonaInsightCard.tsx` + `.test.tsx` |
| Create | `src/components/home/SafetyAlertBadge.tsx` + `.test.tsx` |
| Create | `src/components/sky/MoonHero.tsx` + `.test.tsx` |
| Create | `src/components/sky/SkyTiles.tsx` + `.test.tsx` |
| Create | `src/components/sky/RainbowAlert.tsx` + `.test.tsx` |
| Create | `src/components/sky/SunsetBar.tsx` + `.test.tsx` |
| Create | `app/(tabs)/sky.tsx` |
| Modify | `app/(tabs)/_layout.tsx` — replace `two` with `sky` |
| Modify | `src/components/navigation/StitchTabBar.tsx` — add sky icon |
| Create | `src/components/air/AllergyRiskIndex.tsx` + `.test.tsx` |
| Create | `src/components/air/PollenTrendChart.tsx` + `.test.tsx` |
| Modify | `app/(tabs)/index.tsx` — persona + rain bar + alert badge + insight card |
| Modify | `app/(tabs)/air.tsx` — allergy risk + pollen trend |
| Modify | `app/(tabs)/more.tsx` — pressure headache alert card |

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install suncalc, its types, and openai**

```bash
npx expo install suncalc @types/suncalc openai
```

Expected output: packages added to `node_modules`, `package.json` updated.

- [ ] **Step 2: Verify suncalc resolves**

```bash
node -e "const S = require('suncalc'); console.log(typeof S.getMoonIllumination)"
```

Expected: `function`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add suncalc, @types/suncalc, openai deps"
```

---

## Task 2: Extend Types + openMeteo hourly surface_pressure

**Files:**
- Modify: `src/types/weather.ts`
- Modify: `src/api/openMeteo.ts`

- [ ] **Step 1: Write the failing type-check test**

Create `src/types/__tests__/weather.types.test.ts`:

```typescript
import type { HourlyWeather, LunarData, SkyPhenomena, RainSegment, PressureAlertData, AllergyRiskData, WeatherAlert } from '@/src/types/weather'

describe('weather type extensions', () => {
  it('HourlyWeather has surfacePressure', () => {
    const h: HourlyWeather = {
      time: [],
      temperature: [],
      apparentTemperature: [],
      precipitationProbability: [],
      precipitation: [],
      weatherCode: [],
      windSpeed: [],
      windGusts: [],
      uvIndex: [],
      cloudCover: [],
      visibility: [],
      humidity: [],
      surfacePressure: [],
    }
    expect(h.surfacePressure).toBeDefined()
  })

  it('LunarData shape is correct', () => {
    const l: LunarData = {
      phaseName: 'Full Moon',
      illumination: 1,
      phaseAngle: 0.5,
      rise: new Date(),
      set: null,
      nextFullMoon: new Date(),
      nextNewMoon: new Date(),
    }
    expect(l.phaseName).toBe('Full Moon')
  })

  it('SkyPhenomena shape is correct', () => {
    const s: SkyPhenomena = {
      stargazingScore: 7,
      sunsetScore: 8,
      goldenHourStart: new Date(),
      goldenHourEnd: new Date(),
      goldenHourQuality: 'Good',
      rainbowWindow: null,
    }
    expect(s.stargazingScore).toBe(7)
  })

  it('WeatherAlert shape is correct', () => {
    const a: WeatherAlert = {
      id: 'x',
      title: 'T',
      description: 'D',
      severity: 'severe',
      source: 'nws',
      geometry: null,
    }
    expect(a.source).toBe('nws')
  })
})
```

- [ ] **Step 2: Run — expect compile error (types missing)**

```bash
npx jest src/types/__tests__/weather.types.test.ts
```

Expected: TypeScript error about missing fields.

- [ ] **Step 3: Extend `src/types/weather.ts`**

Add `surfacePressure: number[]` to `HourlyWeather` and append the new interfaces at the end of the file:

```typescript
export interface HourlyWeather {
  time: string[]
  temperature: number[]
  apparentTemperature: number[]
  precipitationProbability: number[]
  precipitation: number[]
  weatherCode: number[]
  windSpeed: number[]
  windGusts: number[]
  uvIndex: number[]
  cloudCover: number[]
  visibility: number[]
  humidity: number[]
  surfacePressure: number[]
}

export interface LunarData {
  phaseName: string
  illumination: number
  phaseAngle: number
  rise: Date | null
  set: Date | null
  nextFullMoon: Date
  nextNewMoon: Date
}

export interface RainbowWindow {
  likelyAt: Date
  faceDirection: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'
}

export interface SkyPhenomena {
  stargazingScore: number
  sunsetScore: number
  goldenHourStart: Date
  goldenHourEnd: Date
  goldenHourQuality: 'Excellent' | 'Good' | 'Fair'
  rainbowWindow: RainbowWindow | null
}

export interface RainSegment {
  probability: number
  time: Date
}

export interface PressureAlertData {
  alert: boolean
  delta: number
  direction: 'rising' | 'falling'
  windowStart: number
}

export interface AllergyRiskData {
  label: 'Low' | 'Moderate' | 'High' | 'Very High'
  score: number
  dominantAllergen: string | null
}

export interface WeatherAlert {
  id: string
  title: string
  description: string
  severity: 'moderate' | 'severe' | 'extreme'
  source: 'nws' | 'weathercode' | 'precipitation'
  geometry: { type: 'Polygon'; coordinates: number[][][] } | null
}
```

- [ ] **Step 4: Update `src/api/openMeteo.ts` — add surface_pressure to hourly**

In `OpenMeteoHourlyRaw`, add:
```typescript
  surface_pressure: number[]
```

In `mapHourly()`, add:
```typescript
    surfacePressure: raw.surface_pressure,
```

In `fetchWeather()`, add `'surface_pressure'` to the hourly array:
```typescript
    hourly: [
      'temperature_2m',
      'apparent_temperature',
      'precipitation_probability',
      'precipitation',
      'weathercode',
      'windspeed_10m',
      'windgusts_10m',
      'uv_index',
      'cloud_cover',
      'visibility',
      'relativehumidity_2m',
      'surface_pressure',
    ].join(','),
```

- [ ] **Step 5: Run test — expect pass**

```bash
npx jest src/types/__tests__/weather.types.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/types/weather.ts src/api/openMeteo.ts src/types/__tests__/weather.types.test.ts
git commit -m "feat: extend HourlyWeather with surfacePressure, add LunarData/SkyPhenomena/WeatherAlert types"
```

---

## Task 3: Persona Store

**Files:**
- Create: `src/store/personaStore.ts`
- Create: `src/store/__tests__/personaStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/__tests__/personaStore.test.ts`:

```typescript
import { act } from 'react'
import { usePersonaStore } from '@/src/store/personaStore'

describe('personaStore', () => {
  beforeEach(() => {
    usePersonaStore.setState({ persona: 'athlete' })
  })

  it('defaults to athlete', () => {
    expect(usePersonaStore.getState().persona).toBe('athlete')
  })

  it('setPersona switches to wellness', () => {
    act(() => {
      usePersonaStore.getState().setPersona('wellness')
    })
    expect(usePersonaStore.getState().persona).toBe('wellness')
  })

  it('setPersona switches back to athlete', () => {
    usePersonaStore.setState({ persona: 'wellness' })
    act(() => {
      usePersonaStore.getState().setPersona('athlete')
    })
    expect(usePersonaStore.getState().persona).toBe('athlete')
  })
})
```

- [ ] **Step 2: Run — expect fail (module not found)**

```bash
npx jest src/store/__tests__/personaStore.test.ts
```

- [ ] **Step 3: Create `src/store/personaStore.ts`**

```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface PersonaStore {
  persona: 'athlete' | 'wellness'
  setPersona: (p: 'athlete' | 'wellness') => void
}

export const usePersonaStore = create<PersonaStore>()(
  persist(
    (set) => ({
      persona: 'athlete',
      setPersona: (persona) => set({ persona }),
    }),
    {
      name: 'skycast-persona',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
```

- [ ] **Step 4: Run test — expect pass**

```bash
npx jest src/store/__tests__/personaStore.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/store/personaStore.ts src/store/__tests__/personaStore.test.ts
git commit -m "feat: add persona store (athlete/wellness) with AsyncStorage persistence"
```

---

## Task 4: Sky Phenomena Utilities

**Files:**
- Create: `src/utils/skyPhenomena.ts`
- Create: `src/utils/__tests__/skyPhenomena.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/__tests__/skyPhenomena.test.ts`:

```typescript
import {
  computeStargazingScore,
  computeSunsetScore,
  detectRainbowWindow,
} from '@/src/utils/skyPhenomena'
import type { HourlyWeather } from '@/src/types/weather'

function makeHourly(overrides: Partial<HourlyWeather> = {}): HourlyWeather {
  const n = 24
  const fill = (v: number) => Array(n).fill(v)
  const base = new Date('2026-04-19T12:00:00')
  const time = Array.from({ length: n }, (_, i) => {
    const d = new Date(base.getTime() + i * 3600_000)
    return d.toISOString().slice(0, 16)
  })
  return {
    time,
    temperature: fill(20),
    apparentTemperature: fill(19),
    precipitationProbability: fill(0),
    precipitation: fill(0),
    weatherCode: fill(1),
    windSpeed: fill(10),
    windGusts: fill(12),
    uvIndex: fill(3),
    cloudCover: fill(10),
    visibility: fill(20),
    humidity: fill(50),
    surfacePressure: fill(1013),
    ...overrides,
  }
}

describe('computeStargazingScore', () => {
  it('returns 10 for perfect conditions', () => {
    const score = computeStargazingScore(0, 0, 20)
    expect(score).toBeCloseTo(11, 0) // base 10 + 1 visibility bonus, clamped to 10
    // actually clamped: 10 - 0 - 0 + 1 = 11 → clamp → 10
    expect(score).toBe(10)
  })

  it('penalises full cloud cover (100%)', () => {
    const score = computeStargazingScore(100, 0, 20)
    // 10 - 10 - 0 + 1 = 1
    expect(score).toBe(1)
  })

  it('penalises full moon (illumination 1.0)', () => {
    const score = computeStargazingScore(0, 1.0, 20)
    // 10 - 0 - 3 + 1 = 8
    expect(score).toBe(8)
  })

  it('clamps to 0 for terrible conditions', () => {
    const score = computeStargazingScore(100, 1.0, 0)
    // 10 - 10 - 3 + 0 = -3 → 0
    expect(score).toBe(0)
  })
})

describe('computeSunsetScore', () => {
  it('returns base 5 for neutral conditions', () => {
    const score = computeSunsetScore(60, 30, 0, 0)
    // 5 - 0 (cloud not in 20-50, not >70) + 0 (humidity not 40-65) + 0 (wc not 1-3) - 0
    expect(score).toBe(5)
  })

  it('awards +2 for thin cloud (30%)', () => {
    const score = computeSunsetScore(30, 50, 0, 0)
    // 5 + 2 (cloud 20-50) + 1 (humidity 40-65) = 8
    expect(score).toBe(8)
  })

  it('penalises overcast (>70%)', () => {
    const score = computeSunsetScore(80, 50, 0, 0)
    // 5 - 3 + 1 = 3
    expect(score).toBe(3)
  })

  it('clamps to 0', () => {
    const score = computeSunsetScore(80, 30, 0, 90)
    // 5 - 3 - 2 = 0
    expect(score).toBe(0)
  })
})

describe('detectRainbowWindow', () => {
  it('returns null when no rain-then-clear sequence', () => {
    const h = makeHourly({ precipitationProbability: Array(24).fill(0) })
    expect(detectRainbowWindow(h, 51.5, -0.1, 0)).toBeNull()
  })

  it('returns null when rain never clears', () => {
    const h = makeHourly({ precipitationProbability: Array(24).fill(80) })
    expect(detectRainbowWindow(h, 51.5, -0.1, 0)).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
npx jest src/utils/__tests__/skyPhenomena.test.ts
```

- [ ] **Step 3: Create `src/utils/skyPhenomena.ts`**

```typescript
import SunCalc from 'suncalc'
import type { HourlyWeather, RainbowWindow } from '@/src/types/weather'

export function computeStargazingScore(
  cloudCoverPercent: number,
  moonIllumination: number,
  visibilityKm: number,
): number {
  const base = 10
  const cloudPenalty = cloudCoverPercent / 10
  const moonPenalty = moonIllumination * 3
  const visBonus = Math.min(visibilityKm / 20, 1)
  return Math.max(0, Math.min(10, base - cloudPenalty - moonPenalty + visBonus))
}

export function computeSunsetScore(
  cloudCoverPercent: number,
  humidity: number,
  weatherCode: number,
  precipProbability: number,
): number {
  let score = 5
  if (cloudCoverPercent >= 20 && cloudCoverPercent <= 50) score += 2
  if (cloudCoverPercent > 70) score -= 3
  if (humidity >= 40 && humidity <= 65) score += 1
  if ([1, 2, 3].includes(weatherCode)) score += 1
  if (precipProbability > 50) score -= 2
  return Math.max(0, Math.min(10, score))
}

type CompassDir = RainbowWindow['faceDirection']

function azimuthToCompass(azimuthRad: number): CompassDir {
  const bearing = ((180 + azimuthRad * (180 / Math.PI)) % 360 + 360) % 360
  const dirs: CompassDir[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(bearing / 45) % 8] ?? 'N'
}

export function detectRainbowWindow(
  hourly: HourlyWeather,
  lat: number,
  lon: number,
  fromIndex: number,
): RainbowWindow | null {
  const lookAhead = 4
  const end = Math.min(fromIndex + lookAhead, hourly.time.length - 1)

  for (let i = fromIndex; i < end - 1; i++) {
    const precip = hourly.precipitationProbability[i] ?? 0
    if (precip <= 40) continue

    const nextIdx = i + 1
    const precipNext = hourly.precipitationProbability[nextIdx] ?? 100
    if (precipNext >= 20) continue

    const cloud = hourly.cloudCover[nextIdx] ?? 100
    if (cloud >= 60) continue

    const clearingTime = new Date(hourly.time[nextIdx] ?? '')
    const pos = SunCalc.getPosition(clearingTime, lat, lon)
    const altDeg = pos.altitude * (180 / Math.PI)
    if (altDeg < 20 || altDeg > 42) continue

    const sunDir = azimuthToCompass(pos.azimuth)
    const dirs: CompassDir[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    const sunIdx = dirs.indexOf(sunDir)
    const faceDirection = dirs[(sunIdx + 4) % 8] ?? 'N'
    return { likelyAt: clearingTime, faceDirection }
  }
  return null
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx jest src/utils/__tests__/skyPhenomena.test.ts
```

Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/skyPhenomena.ts src/utils/__tests__/skyPhenomena.test.ts
git commit -m "feat: sky phenomena utils — stargazing score, sunset score, rainbow detection"
```

---

## Task 5: Allergy Risk + Pressure Alert Utilities

**Files:**
- Create: `src/utils/allergyRisk.ts`
- Create: `src/utils/pressureAlert.ts`
- Create: `src/utils/__tests__/allergyRisk.test.ts`
- Create: `src/utils/__tests__/pressureAlert.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/utils/__tests__/allergyRisk.test.ts`:

```typescript
import { computeAllergyRisk } from '@/src/utils/allergyRisk'
import type { AirQualityData } from '@/src/types/weather'

function makeHourly(overrides: Partial<AirQualityData['hourly']> = {}): AirQualityData['hourly'] {
  const n = 24
  return {
    time: Array.from({ length: n }, (_, i) => `2026-04-19T${String(i).padStart(2, '0')}:00`),
    pm10: Array(n).fill(5),
    pm25: Array(n).fill(3),
    no2: Array(n).fill(10),
    ozone: Array(n).fill(40),
    alderPollen: Array(n).fill(null),
    birchPollen: Array(n).fill(null),
    grassPollen: Array(n).fill(null),
    mugwortPollen: Array(n).fill(null),
    olivePollen: Array(n).fill(null),
    ragweedPollen: Array(n).fill(null),
    ...overrides,
  }
}

describe('computeAllergyRisk', () => {
  it('returns Low when all pollen is null', () => {
    const result = computeAllergyRisk(makeHourly(), 0, 50, 10)
    expect(result.label).toBe('Low')
    expect(result.dominantAllergen).toBeNull()
  })

  it('returns High for grass pollen ~25 grains', () => {
    const hourly = makeHourly({ grassPollen: Array(24).fill(25) })
    const result = computeAllergyRisk(hourly, 0, 50, 10)
    expect(['High', 'Moderate']).toContain(result.label)
    expect(result.dominantAllergen).toBe('Grass')
  })

  it('humidity multiplier raises score', () => {
    const h1 = makeHourly({ grassPollen: Array(24).fill(25) })
    const low = computeAllergyRisk(h1, 0, 50, 10)
    const high = computeAllergyRisk(h1, 0, 80, 10)
    expect(high.score).toBeGreaterThan(low.score)
  })

  it('high wind reduces score by 0.5', () => {
    const h = makeHourly({ grassPollen: Array(24).fill(25) })
    const calm = computeAllergyRisk(h, 0, 50, 10)
    const windy = computeAllergyRisk(h, 0, 50, 25)
    expect(windy.score).toBeLessThan(calm.score)
  })
})
```

Create `src/utils/__tests__/pressureAlert.test.ts`:

```typescript
import { detectPressureAlert } from '@/src/utils/pressureAlert'

describe('detectPressureAlert', () => {
  it('returns no alert for stable pressure', () => {
    const pressure = Array.from({ length: 15 }, () => 1013)
    expect(detectPressureAlert(pressure, 0).alert).toBe(false)
  })

  it('detects drop > 8 hPa in 3 hours', () => {
    const pressure = [1013, 1010, 1007, 1004, 1002, 1001, 1000, 999, 998]
    const result = detectPressureAlert(pressure, 0)
    expect(result.alert).toBe(true)
    expect(result.direction).toBe('falling')
    expect(result.delta).toBeLessThan(-8)
  })

  it('detects rise > 10 hPa in 3 hours', () => {
    const pressure = [1000, 1003, 1007, 1012, 1013, 1013]
    const result = detectPressureAlert(pressure, 0)
    expect(result.alert).toBe(true)
    expect(result.direction).toBe('rising')
    expect(result.delta).toBeGreaterThan(10)
  })

  it('respects fromIndex offset', () => {
    const pressure = [1013, 1013, 1013, 1013, 1013, 1010, 1007, 1004, 1002]
    expect(detectPressureAlert(pressure, 0).alert).toBe(false)
    expect(detectPressureAlert(pressure, 2).alert).toBe(true)
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
npx jest src/utils/__tests__/allergyRisk.test.ts src/utils/__tests__/pressureAlert.test.ts
```

- [ ] **Step 3: Create `src/utils/allergyRisk.ts`**

```typescript
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
```

- [ ] **Step 4: Create `src/utils/pressureAlert.ts`**

```typescript
import type { PressureAlertData } from '@/src/types/weather'

const DROP_THRESHOLD = 8
const RISE_THRESHOLD = 10

export function detectPressureAlert(
  surfacePressureHourly: number[],
  fromIndex: number,
): PressureAlertData {
  const lookAhead = 12
  const end = Math.min(fromIndex + lookAhead, surfacePressureHourly.length)

  for (let i = fromIndex; i < end - 3; i++) {
    const start = surfacePressureHourly[i] ?? 0
    const later = surfacePressureHourly[i + 3] ?? 0
    const delta = later - start

    if (delta < -DROP_THRESHOLD) {
      return { alert: true, delta, direction: 'falling', windowStart: i }
    }
    if (delta > RISE_THRESHOLD) {
      return { alert: true, delta, direction: 'rising', windowStart: i }
    }
  }

  return { alert: false, delta: 0, direction: 'falling', windowStart: fromIndex }
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx jest src/utils/__tests__/allergyRisk.test.ts src/utils/__tests__/pressureAlert.test.ts
```

Expected: PASS (8 tests)

- [ ] **Step 6: Commit**

```bash
git add src/utils/allergyRisk.ts src/utils/pressureAlert.ts src/utils/__tests__/allergyRisk.test.ts src/utils/__tests__/pressureAlert.test.ts
git commit -m "feat: allergy risk index and pressure alert detection utilities"
```

---

## Task 6: Hooks — useLunar + useSkyPhenomena

**Files:**
- Create: `src/hooks/useLunar.ts`
- Create: `src/hooks/useSkyPhenomena.ts`

These hooks are pure computation (useMemo), no network calls.

- [ ] **Step 1: Create `src/hooks/useLunar.ts`**

```typescript
import { useMemo } from 'react'
import SunCalc from 'suncalc'
import type { LunarData } from '@/src/types/weather'

function getPhaseName(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return 'New Moon'
  if (phase < 0.22) return 'Waxing Crescent'
  if (phase < 0.28) return 'First Quarter'
  if (phase < 0.47) return 'Waxing Gibbous'
  if (phase < 0.53) return 'Full Moon'
  if (phase < 0.72) return 'Waning Gibbous'
  if (phase < 0.78) return 'Last Quarter'
  return 'Waning Crescent'
}

function findNextMoonPhase(targetPhase: number): Date {
  const now = new Date()
  for (let d = 1; d <= 30; d++) {
    const date = new Date(now.getTime() + d * 24 * 60 * 60 * 1000)
    const prev = new Date(date.getTime() - 24 * 60 * 60 * 1000)
    const ill = SunCalc.getMoonIllumination(date)
    const prevIll = SunCalc.getMoonIllumination(prev)
    if (targetPhase === 0.5) {
      if (prevIll.phase < 0.5 && ill.phase >= 0.5) return date
    } else {
      if (prevIll.phase > 0.9 && ill.phase < 0.1) return date
    }
  }
  return new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
}

export function useLunar(lat: number | null, lon: number | null): LunarData | null {
  return useMemo(() => {
    if (lat === null || lon === null) return null
    const now = new Date()
    const ill = SunCalc.getMoonIllumination(now)
    const times = SunCalc.getMoonTimes(now, lat, lon)
    return {
      phaseName: getPhaseName(ill.phase),
      illumination: ill.fraction,
      phaseAngle: ill.phase,
      rise: times.rise ?? null,
      set: times.set ?? null,
      nextFullMoon: findNextMoonPhase(0.5),
      nextNewMoon: findNextMoonPhase(0),
    }
  }, [lat, lon])
}
```

- [ ] **Step 2: Create `src/hooks/useSkyPhenomena.ts`**

```typescript
import { useMemo } from 'react'
import SunCalc from 'suncalc'
import type { HourlyWeather, SkyPhenomena } from '@/src/types/weather'
import { computeStargazingScore, computeSunsetScore, detectRainbowWindow } from '@/src/utils/skyPhenomena'

function getCurrentHourIdx(times: string[]): number {
  const prefix = new Date().toISOString().slice(0, 13)
  const idx = times.findIndex((t) => t.startsWith(prefix))
  return idx === -1 ? 0 : idx
}

export function useSkyPhenomena(
  hourly: HourlyWeather | undefined,
  lat: number | null,
  lon: number | null,
): SkyPhenomena | null {
  return useMemo(() => {
    if (!hourly || lat === null || lon === null) return null
    const now = new Date()
    const sunTimes = SunCalc.getTimes(now, lat, lon)
    const idx = getCurrentHourIdx(hourly.time)

    const cloudCover = hourly.cloudCover[idx] ?? 50
    const humidity = hourly.humidity[idx] ?? 50
    const weatherCode = hourly.weatherCode[idx] ?? 0
    const precipProb = hourly.precipitationProbability[idx] ?? 0
    const visKm = hourly.visibility[idx] ?? 10
    const moonIll = SunCalc.getMoonIllumination(now)

    return {
      stargazingScore: computeStargazingScore(cloudCover, moonIll.fraction, visKm),
      sunsetScore: computeSunsetScore(cloudCover, humidity, weatherCode, precipProb),
      goldenHourStart: sunTimes.goldenHour,
      goldenHourEnd: sunTimes.goldenHourEnd,
      goldenHourQuality: cloudCover < 20 ? 'Excellent' : cloudCover < 50 ? 'Good' : 'Fair',
      rainbowWindow: detectRainbowWindow(hourly, lat, lon, idx),
    }
  }, [hourly, lat, lon])
}
```

- [ ] **Step 3: Verify TypeScript compiles (no test needed for pure memoised hooks)**

```bash
npx tsc --noEmit
```

Expected: no errors for the new files.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useLunar.ts src/hooks/useSkyPhenomena.ts
git commit -m "feat: useLunar and useSkyPhenomena hooks using suncalc"
```

---

## Task 7: Hooks — useRainBar + usePressureAlert + useWeatherAlerts

**Files:**
- Create: `src/hooks/useRainBar.ts`
- Create: `src/hooks/usePressureAlert.ts`
- Create: `src/hooks/useWeatherAlerts.ts`

- [ ] **Step 1: Create `src/hooks/useRainBar.ts`**

```typescript
import { useMemo } from 'react'
import type { HourlyWeather, RainSegment } from '@/src/types/weather'

function getCurrentHourIdx(times: string[]): number {
  const prefix = new Date().toISOString().slice(0, 13)
  const idx = times.findIndex((t) => t.startsWith(prefix))
  return idx === -1 ? 0 : idx
}

interface RainBarResult {
  segments: RainSegment[]
  peakProbability: number
  peakTime: Date | null
}

export function useRainBar(hourly: HourlyWeather | undefined): RainBarResult {
  return useMemo(() => {
    if (!hourly) return { segments: [], peakProbability: 0, peakTime: null }

    const fromIdx = getCurrentHourIdx(hourly.time)
    const SEGMENT_COUNT = 12
    const SEGMENT_MINUTES = 15
    const segments: RainSegment[] = []

    for (let s = 0; s < SEGMENT_COUNT; s++) {
      const minutesOffset = s * SEGMENT_MINUTES
      const hourOffset = minutesOffset / 60
      const hourFloor = Math.floor(hourOffset)
      const frac = hourOffset - hourFloor

      const i0 = fromIdx + hourFloor
      const i1 = Math.min(i0 + 1, hourly.precipitationProbability.length - 1)

      const p0 = hourly.precipitationProbability[i0] ?? 0
      const p1 = hourly.precipitationProbability[i1] ?? p0
      const probability = p0 + (p1 - p0) * frac

      const baseTime = new Date(hourly.time[i0] ?? new Date().toISOString())
      const time = new Date(baseTime.getTime() + (minutesOffset % 60) * 60 * 1000)
      segments.push({ probability, time })
    }

    const peakProbability = segments.reduce((m, s) => Math.max(m, s.probability), 0)
    const peakSeg = segments.find((s) => s.probability === peakProbability)

    return {
      segments,
      peakProbability,
      peakTime: peakProbability >= 10 ? (peakSeg?.time ?? null) : null,
    }
  }, [hourly])
}
```

- [ ] **Step 2: Create `src/hooks/usePressureAlert.ts`**

```typescript
import { useMemo } from 'react'
import type { HourlyWeather, PressureAlertData } from '@/src/types/weather'
import { detectPressureAlert } from '@/src/utils/pressureAlert'

function getCurrentHourIdx(times: string[]): number {
  const prefix = new Date().toISOString().slice(0, 13)
  const idx = times.findIndex((t) => t.startsWith(prefix))
  return idx === -1 ? 0 : idx
}

const NO_ALERT: PressureAlertData = { alert: false, delta: 0, direction: 'falling', windowStart: 0 }

export function usePressureAlert(hourly: HourlyWeather | undefined): PressureAlertData {
  return useMemo(() => {
    if (!hourly?.surfacePressure?.length) return NO_ALERT
    const fromIdx = getCurrentHourIdx(hourly.time)
    return detectPressureAlert(hourly.surfacePressure, fromIdx)
  }, [hourly])
}
```

- [ ] **Step 3: Create `src/hooks/useWeatherAlerts.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import type { WeatherAlert } from '@/src/types/weather'

interface NWSProperties {
  headline: string
  description: string
  severity: string
  event: string
}

interface NWSFeature {
  id: string
  properties: NWSProperties
  geometry: { type: string; coordinates: number[][][] } | null
}

interface NWSResponse {
  features: NWSFeature[]
}

async function fetchNWSAlerts(lat: number, lon: number): Promise<WeatherAlert[]> {
  const url = `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Skycast/1.0 (contact@skycast.app)' },
  })
  if (!res.ok) return []
  const data = (await res.json()) as NWSResponse
  return (data.features ?? []).map((f) => ({
    id: f.id,
    title: f.properties.event,
    description: f.properties.headline,
    severity:
      f.properties.severity === 'Extreme'
        ? ('extreme' as const)
        : f.properties.severity === 'Severe'
          ? ('severe' as const)
          : ('moderate' as const),
    source: 'nws' as const,
    geometry:
      f.geometry?.type === 'Polygon'
        ? (f.geometry as WeatherAlert['geometry'])
        : null,
  }))
}

export function useWeatherAlerts(
  lat: number | null,
  lon: number | null,
  weatherCode?: number,
  precipProbability?: number,
): WeatherAlert[] {
  const { data: nwsAlerts = [] } = useQuery<WeatherAlert[]>({
    queryKey: ['nwsAlerts', lat, lon],
    queryFn: () => fetchNWSAlerts(lat!, lon!),
    enabled: lat !== null && lon !== null,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const localAlerts: WeatherAlert[] = []

  if (weatherCode !== undefined && weatherCode >= 95) {
    localAlerts.push({
      id: 'local-thunderstorm',
      title: 'Thunderstorm Alert',
      description: 'Thunderstorm or severe hail detected in your area.',
      severity: 'severe',
      source: 'weathercode',
      geometry: null,
    })
  }

  if (
    precipProbability !== undefined &&
    precipProbability > 85 &&
    weatherCode !== undefined &&
    weatherCode >= 65 &&
    weatherCode <= 67
  ) {
    localAlerts.push({
      id: 'local-heavy-rain',
      title: 'Heavy Rain Warning',
      description: 'High chance of heavy rain in the next hour.',
      severity: 'moderate',
      source: 'precipitation',
      geometry: null,
    })
  }

  return [...localAlerts, ...nwsAlerts]
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRainBar.ts src/hooks/usePressureAlert.ts src/hooks/useWeatherAlerts.ts
git commit -m "feat: useRainBar, usePressureAlert, useWeatherAlerts hooks"
```

---

## Task 8: PersonaSwitcher + RainProbabilityBar Components

**Files:**
- Create: `src/components/home/PersonaSwitcher.tsx` + `.test.tsx`
- Create: `src/components/home/RainProbabilityBar.tsx` + `.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/home/PersonaSwitcher.test.tsx`:

```typescript
import React from 'react'
import renderer from 'react-test-renderer'
import PersonaSwitcher from './PersonaSwitcher'
import { usePersonaStore } from '@/src/store/personaStore'

beforeEach(() => {
  usePersonaStore.setState({ persona: 'athlete' })
})

describe('PersonaSwitcher', () => {
  it('renders athlete and wellness pills', () => {
    const json = JSON.stringify(renderer.create(<PersonaSwitcher />).toJSON())
    expect(json).toMatch(/Athlete/)
    expect(json).toMatch(/Wellness/)
  })
})
```

Create `src/components/home/RainProbabilityBar.test.tsx`:

```typescript
import React from 'react'
import renderer from 'react-test-renderer'
import RainProbabilityBar from './RainProbabilityBar'
import type { HourlyWeather } from '@/src/types/weather'

function makeHourly(prob: number): HourlyWeather {
  const n = 48
  const time = Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.now() + i * 3600_000)
    return d.toISOString().slice(0, 16)
  })
  return {
    time,
    temperature: Array(n).fill(20),
    apparentTemperature: Array(n).fill(19),
    precipitationProbability: Array(n).fill(prob),
    precipitation: Array(n).fill(0),
    weatherCode: Array(n).fill(1),
    windSpeed: Array(n).fill(10),
    windGusts: Array(n).fill(12),
    uvIndex: Array(n).fill(3),
    cloudCover: Array(n).fill(10),
    visibility: Array(n).fill(20),
    humidity: Array(n).fill(50),
    surfacePressure: Array(n).fill(1013),
  }
}

describe('RainProbabilityBar', () => {
  it('renders null when peak < 10%', () => {
    const tree = renderer.create(<RainProbabilityBar hourly={makeHourly(5)} />).toJSON()
    expect(tree).toBeNull()
  })

  it('renders bar when peak >= 10%', () => {
    const json = JSON.stringify(renderer.create(<RainProbabilityBar hourly={makeHourly(60)} />).toJSON())
    expect(json).toMatch(/Peak/)
    expect(json).toMatch(/60/)
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
npx jest src/components/home/PersonaSwitcher.test.tsx src/components/home/RainProbabilityBar.test.tsx
```

- [ ] **Step 3: Create `src/components/home/PersonaSwitcher.tsx`**

```typescript
import React from 'react'
import { View, Pressable, Text, StyleSheet } from 'react-native'
import { usePersonaStore } from '@/src/store/personaStore'
import { TEXT_PRIMARY, TEXT_SECONDARY } from '@/src/theme/colors'
import { FONT_MEDIUM } from '@/src/theme/typography'

export default function PersonaSwitcher() {
  const { persona, setPersona } = usePersonaStore()

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => setPersona('athlete')}
        style={[styles.pill, persona === 'athlete' && styles.pillActive]}
      >
        <Text style={[styles.label, persona === 'athlete' && styles.labelActive]}>
          🏃 Athlete
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setPersona('wellness')}
        style={[styles.pill, persona === 'wellness' && styles.pillActive]}
      >
        <Text style={[styles.label, persona === 'wellness' && styles.labelActive]}>
          💊 Wellness
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(240,232,216,0.12)',
  },
  pillActive: {
    backgroundColor: 'rgba(245,166,35,0.12)',
    borderColor: 'rgba(245,166,35,0.35)',
  },
  label: { fontSize: 14, color: TEXT_SECONDARY, ...FONT_MEDIUM },
  labelActive: { color: TEXT_PRIMARY },
})
```

- [ ] **Step 4: Create `src/components/home/RainProbabilityBar.tsx`**

```typescript
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { format } from 'date-fns'
import { useRainBar } from '@/src/hooks/useRainBar'
import type { HourlyWeather } from '@/src/types/weather'
import { SECONDARY, TEXT_SECONDARY } from '@/src/theme/colors'
import { FONT_REGULAR } from '@/src/theme/typography'
import SectionLabel from '@/src/components/shared/SectionLabel'

function segmentColor(prob: number): string {
  if (prob < 25) return 'rgba(123,191,255,0.12)'
  if (prob < 50) return 'rgba(123,191,255,0.35)'
  if (prob < 75) return 'rgba(123,191,255,0.65)'
  return SECONDARY
}

interface Props {
  hourly: HourlyWeather
}

export default function RainProbabilityBar({ hourly }: Props) {
  const { segments, peakProbability, peakTime } = useRainBar(hourly)

  if (peakProbability < 10) return null

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SectionLabel text="Next 3 Hours" />
        <Text style={styles.peak}>
          {`Peak ${Math.round(peakProbability)}%${peakTime ? ` · ${format(peakTime, 'h:mm a')}` : ''}`}
        </Text>
      </View>
      <View style={styles.bar}>
        {segments.map((seg, i) => (
          <View key={i} style={[styles.segment, { backgroundColor: segmentColor(seg.probability) }]} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  peak: { fontSize: 12, color: TEXT_SECONDARY, ...FONT_REGULAR },
  bar: { flexDirection: 'row', height: 28, borderRadius: 8, overflow: 'hidden', gap: 1 },
  segment: { flex: 1 },
})
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx jest src/components/home/PersonaSwitcher.test.tsx src/components/home/RainProbabilityBar.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/home/PersonaSwitcher.tsx src/components/home/PersonaSwitcher.test.tsx src/components/home/RainProbabilityBar.tsx src/components/home/RainProbabilityBar.test.tsx
git commit -m "feat: PersonaSwitcher and RainProbabilityBar home components"
```

---

## Task 9: PersonaInsightCard + SafetyAlertBadge Components

**Files:**
- Create: `src/components/home/PersonaInsightCard.tsx` + `.test.tsx`
- Create: `src/components/home/SafetyAlertBadge.tsx` + `.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/home/PersonaInsightCard.test.tsx`:

```typescript
import React from 'react'
import renderer from 'react-test-renderer'
import PersonaInsightCard from './PersonaInsightCard'
import { usePersonaStore } from '@/src/store/personaStore'
import type { HourlyWeather, DailyWeather, AirQualityData } from '@/src/types/weather'

function makeHourly(): HourlyWeather {
  const n = 48
  const time = Array.from({ length: n }, (_, i) => {
    const d = new Date('2026-04-19T00:00:00.000Z')
    d.setHours(i)
    return d.toISOString().slice(0, 16)
  })
  return {
    time, temperature: Array(n).fill(18), apparentTemperature: Array(n).fill(17),
    precipitationProbability: Array(n).fill(10), precipitation: Array(n).fill(0),
    weatherCode: Array(n).fill(1), windSpeed: Array(n).fill(8), windGusts: Array(n).fill(10),
    uvIndex: Array(n).fill(3), cloudCover: Array(n).fill(20), visibility: Array(n).fill(15),
    humidity: Array(n).fill(55), surfacePressure: Array(n).fill(1013),
  }
}

function makeDaily(): DailyWeather {
  return {
    time: ['2026-04-19'], tempMax: [22], tempMin: [14], weatherCode: [1],
    precipitationSum: [0], precipitationProbabilityMax: [10], windSpeedMax: [15],
    windGustsMax: [20], uvIndexMax: [5], sunrise: ['2026-04-19T06:00'], sunset: ['2026-04-19T20:00'],
  }
}

function makeAirHourly(): AirQualityData['hourly'] {
  const n = 48
  return {
    time: Array(n).fill('2026-04-19T00:00'), pm10: Array(n).fill(5), pm25: Array(n).fill(3),
    no2: Array(n).fill(10), ozone: Array(n).fill(40),
    alderPollen: Array(n).fill(null), birchPollen: Array(n).fill(null),
    grassPollen: Array(n).fill(null), mugwortPollen: Array(n).fill(null),
    olivePollen: Array(n).fill(null), ragweedPollen: Array(n).fill(null),
  }
}

describe('PersonaInsightCard', () => {
  it('renders athlete activity insight', () => {
    usePersonaStore.setState({ persona: 'athlete' })
    const json = JSON.stringify(renderer.create(
      <PersonaInsightCard
        hourly={makeHourly()} daily={makeDaily()} airHourly={makeAirHourly()}
        today="2026-04-19" currentHourIdx={10} humidity={55} windSpeed={8} uvIndex={3} usAqi={30}
      />
    ).toJSON())
    expect(json).toMatch(/Activity Window/)
  })

  it('renders wellness health insight', () => {
    usePersonaStore.setState({ persona: 'wellness' })
    const json = JSON.stringify(renderer.create(
      <PersonaInsightCard
        hourly={makeHourly()} daily={makeDaily()} airHourly={makeAirHourly()}
        today="2026-04-19" currentHourIdx={10} humidity={55} windSpeed={8} uvIndex={3} usAqi={30}
      />
    ).toJSON())
    expect(json).toMatch(/Health Alert/)
  })
})
```

Create `src/components/home/SafetyAlertBadge.test.tsx`:

```typescript
import React from 'react'
import renderer from 'react-test-renderer'
import SafetyAlertBadge from './SafetyAlertBadge'
import type { WeatherAlert } from '@/src/types/weather'

const mockAlert: WeatherAlert = {
  id: 'test-1', title: 'Thunderstorm Warning', description: 'Severe thunderstorm approaching.',
  severity: 'severe', source: 'nws', geometry: null,
}

describe('SafetyAlertBadge', () => {
  it('renders null when no alerts', () => {
    const tree = renderer.create(<SafetyAlertBadge alerts={[]} />).toJSON()
    expect(tree).toBeNull()
  })

  it('renders badge with alert title', () => {
    const json = JSON.stringify(renderer.create(<SafetyAlertBadge alerts={[mockAlert]} />).toJSON())
    expect(json).toMatch(/Thunderstorm Warning/)
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
npx jest src/components/home/PersonaInsightCard.test.tsx src/components/home/SafetyAlertBadge.test.tsx
```

- [ ] **Step 3: Create `src/components/home/PersonaInsightCard.tsx`**

```typescript
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import GlassCard from '@/src/components/shared/GlassCard'
import { usePersonaStore } from '@/src/store/personaStore'
import type { HourlyWeather, DailyWeather, AirQualityData } from '@/src/types/weather'
import { scoreRunning, scoreCycling, scoreHiking } from '@/src/utils/activityScores'
import { computeAllergyRisk } from '@/src/utils/allergyRisk'
import { describeAQI, describeUV } from '@/src/utils/weatherDescriptions'
import { ACCENT, TEXT_PRIMARY, TEXT_SECONDARY } from '@/src/theme/colors'
import { FONT_BOLD, FONT_REGULAR } from '@/src/theme/typography'

interface Props {
  hourly: HourlyWeather
  daily: DailyWeather
  airHourly: AirQualityData['hourly']
  today: string
  currentHourIdx: number
  humidity: number
  windSpeed: number
  uvIndex: number
  usAqi: number
}

export default function PersonaInsightCard({
  hourly, daily, airHourly, today, currentHourIdx, humidity, windSpeed, uvIndex, usAqi,
}: Props) {
  const { persona } = usePersonaStore()

  let title: string
  let body: string

  if (persona === 'athlete') {
    const scores = [
      { name: 'Running', s: scoreRunning(hourly, daily, today) },
      { name: 'Cycling', s: scoreCycling(hourly, daily, today) },
      { name: 'Hiking', s: scoreHiking(hourly, daily, today) },
    ].sort((a, b) => b.s.score - a.s.score)
    const best = scores[0]
    title = '🏃 Activity Window'
    body = best
      ? `${best.name}: ${best.s.label}${best.s.bestWindow ? ` · ${best.s.bestWindow}` : ''}. ${best.s.reason}`
      : 'Check back for activity scores.'
  } else {
    const risk = computeAllergyRisk(airHourly, currentHourIdx, humidity, windSpeed)
    const aqiInfo = describeAQI(usAqi)
    const uvDesc = describeUV(uvIndex)
    title = '💊 Health Alert'
    const concerns: string[] = []
    if (risk.label !== 'Low' && risk.dominantAllergen) {
      concerns.push(`${risk.dominantAllergen} pollen ${risk.label}`)
    }
    if (usAqi > 50) concerns.push(`AQI ${aqiInfo.label}`)
    if (uvIndex >= 7) concerns.push(`UV ${uvDesc}`)
    body = concerns.length > 0 ? concerns.join(' · ') : 'All clear — good day for outdoor wellness.'
  }

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: { padding: 16 },
  title: {
    fontSize: 11, fontWeight: '600', letterSpacing: 1.2,
    textTransform: 'uppercase', color: ACCENT, marginBottom: 6,
    fontFamily: 'PlusJakartaSans',
  },
  body: { fontSize: 14, color: TEXT_PRIMARY, lineHeight: 20, ...FONT_REGULAR },
})
```

- [ ] **Step 4: Create `src/components/home/SafetyAlertBadge.tsx`**

```typescript
import React, { useState } from 'react'
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import type { WeatherAlert } from '@/src/types/weather'
import { DANGER, WARNING, TEXT_PRIMARY, TEXT_SECONDARY, GLASS_BG, GHOST_BORDER } from '@/src/theme/colors'
import { FONT_BOLD, FONT_MEDIUM, FONT_REGULAR } from '@/src/theme/typography'

interface Props {
  alerts: WeatherAlert[]
}

export default function SafetyAlertBadge({ alerts }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  if (alerts.length === 0) return null

  const top = alerts[0]!
  const color = top.severity === 'extreme' ? DANGER : WARNING

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[styles.badge, { borderColor: color }]}>
        <Ionicons name="warning" size={14} color={color} />
        <Text style={[styles.badgeText, { color }]} numberOfLines={1}>
          {top.title}
        </Text>
        {alerts.length > 1 && (
          <Text style={[styles.count, { color }]}>+{alerts.length - 1}</Text>
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          {alerts.map((a) => (
            <View key={a.id} style={styles.alertRow}>
              <Ionicons name="warning" size={16} color={a.severity === 'extreme' ? DANGER : WARNING} />
              <View style={styles.alertText}>
                <Text style={styles.alertTitle}>{a.title}</Text>
                <Text style={styles.alertDesc} numberOfLines={3}>{a.description}</Text>
              </View>
            </View>
          ))}
          <Pressable
            style={styles.mapBtn}
            onPress={() => { setOpen(false); router.push('/radar') }}
          >
            <Text style={styles.mapBtnText}>See on map</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
    backgroundColor: 'rgba(255,107,107,0.08)',
  },
  badgeText: { fontSize: 13, flex: 1, ...FONT_MEDIUM },
  count: { fontSize: 12, ...FONT_MEDIUM },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: GLASS_BG, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderColor: GHOST_BORDER, padding: 20, gap: 16,
  },
  alertRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  alertText: { flex: 1 },
  alertTitle: { fontSize: 14, color: TEXT_PRIMARY, ...FONT_BOLD, marginBottom: 2 },
  alertDesc: { fontSize: 13, color: TEXT_SECONDARY, ...FONT_REGULAR },
  mapBtn: { padding: 14, borderRadius: 12, backgroundColor: 'rgba(123,191,255,0.15)', alignItems: 'center' },
  mapBtnText: { color: '#7bbfff', fontSize: 15, ...FONT_BOLD },
})
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx jest src/components/home/PersonaInsightCard.test.tsx src/components/home/SafetyAlertBadge.test.tsx
```

Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/home/PersonaInsightCard.tsx src/components/home/PersonaInsightCard.test.tsx src/components/home/SafetyAlertBadge.tsx src/components/home/SafetyAlertBadge.test.tsx
git commit -m "feat: PersonaInsightCard and SafetyAlertBadge home components"
```

---

## Task 10: Sky Tab Components

**Files:**
- Create: `src/components/sky/MoonHero.tsx` + `.test.tsx`
- Create: `src/components/sky/SkyTiles.tsx` + `.test.tsx`
- Create: `src/components/sky/RainbowAlert.tsx` + `.test.tsx`
- Create: `src/components/sky/SunsetBar.tsx` + `.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/sky/MoonHero.test.tsx`:

```typescript
import React from 'react'
import renderer from 'react-test-renderer'
import MoonHero from './MoonHero'
import type { LunarData } from '@/src/types/weather'

const lunar: LunarData = {
  phaseName: 'Full Moon', illumination: 0.98, phaseAngle: 0.5,
  rise: new Date('2026-04-19T20:30:00'), set: new Date('2026-04-20T06:45:00'),
  nextFullMoon: new Date('2026-05-13'), nextNewMoon: new Date('2026-04-27'),
}

describe('MoonHero', () => {
  it('renders phase name and illumination', () => {
    const json = JSON.stringify(renderer.create(<MoonHero lunar={lunar} />).toJSON())
    expect(json).toMatch(/Full Moon/)
    expect(json).toMatch(/98/)
  })
})
```

Create `src/components/sky/SunsetBar.test.tsx`:

```typescript
import React from 'react'
import renderer from 'react-test-renderer'
import SunsetBar from './SunsetBar'

describe('SunsetBar', () => {
  it('renders score and label', () => {
    const json = JSON.stringify(renderer.create(<SunsetBar score={8} />).toJSON())
    expect(json).toMatch(/8/)
    expect(json).toMatch(/Spectacular/)
  })

  it('shows Muted for low score', () => {
    const json = JSON.stringify(renderer.create(<SunsetBar score={2} />).toJSON())
    expect(json).toMatch(/Muted/)
  })
})
```

Create `src/components/sky/RainbowAlert.test.tsx`:

```typescript
import React from 'react'
import renderer from 'react-test-renderer'
import RainbowAlert from './RainbowAlert'
import type { RainbowWindow } from '@/src/types/weather'

describe('RainbowAlert', () => {
  it('renders likely time and direction', () => {
    const w: RainbowWindow = { likelyAt: new Date('2026-04-19T17:30:00'), faceDirection: 'E' }
    const json = JSON.stringify(renderer.create(<RainbowAlert window={w} />).toJSON())
    expect(json).toMatch(/Rainbow/)
    expect(json).toMatch(/E/)
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
npx jest src/components/sky/
```

- [ ] **Step 3: Create `src/components/sky/MoonHero.tsx`**

```typescript
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { format } from 'date-fns'
import GlassCard from '@/src/components/shared/GlassCard'
import type { LunarData } from '@/src/types/weather'
import { ACCENT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY } from '@/src/theme/colors'
import { FONT_BOLD, FONT_MEDIUM, FONT_REGULAR } from '@/src/theme/typography'

const PHASE_EMOJI: Record<string, string> = {
  'New Moon': '🌑', 'Waxing Crescent': '🌒', 'First Quarter': '🌓', 'Waxing Gibbous': '🌔',
  'Full Moon': '🌕', 'Waning Gibbous': '🌖', 'Last Quarter': '🌗', 'Waning Crescent': '🌘',
}

interface Props {
  lunar: LunarData
}

export default function MoonHero({ lunar }: Props) {
  const emoji = PHASE_EMOJI[lunar.phaseName] ?? '🌙'
  const illPct = Math.round(lunar.illumination * 100)

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.phaseName}>{lunar.phaseName}</Text>
      <Text style={styles.illumination}>{illPct}% illuminated</Text>
      <View style={styles.timesRow}>
        {lunar.rise && (
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>Rise</Text>
            <Text style={styles.timeValue}>{format(lunar.rise, 'h:mm a')}</Text>
          </View>
        )}
        {lunar.set && (
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>Set</Text>
            <Text style={styles.timeValue}>{format(lunar.set, 'h:mm a')}</Text>
          </View>
        )}
      </View>
      <View style={styles.nextRow}>
        <Text style={styles.nextLabel}>Next Full Moon</Text>
        <Text style={styles.nextValue}>{format(lunar.nextFullMoon, 'MMM d')}</Text>
        <Text style={styles.nextLabel}>· New Moon</Text>
        <Text style={styles.nextValue}>{format(lunar.nextNewMoon, 'MMM d')}</Text>
      </View>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: { padding: 20, alignItems: 'center', gap: 4 },
  emoji: { fontSize: 56 },
  phaseName: { fontSize: 20, color: TEXT_PRIMARY, ...FONT_BOLD, marginTop: 4 },
  illumination: { fontSize: 14, color: TEXT_SECONDARY, ...FONT_REGULAR },
  timesRow: { flexDirection: 'row', gap: 24, marginTop: 12 },
  timeItem: { alignItems: 'center', gap: 2 },
  timeLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: TEXT_TERTIARY },
  timeValue: { fontSize: 15, color: TEXT_PRIMARY, ...FONT_MEDIUM },
  nextRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, alignItems: 'center', justifyContent: 'center' },
  nextLabel: { fontSize: 12, color: TEXT_TERTIARY, ...FONT_REGULAR },
  nextValue: { fontSize: 13, color: ACCENT, ...FONT_MEDIUM },
})
```

- [ ] **Step 4: Create `src/components/sky/SkyTiles.tsx`**

```typescript
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { format } from 'date-fns'
import GlassCard from '@/src/components/shared/GlassCard'
import type { SkyPhenomena, LunarData } from '@/src/types/weather'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, GOOD, WARNING, DANGER } from '@/src/theme/colors'
import { FONT_BOLD, FONT_REGULAR } from '@/src/theme/typography'

interface Props {
  phenomena: SkyPhenomena
  lunar: LunarData
}

export default function SkyTiles({ phenomena, lunar }: Props) {
  const starColor =
    phenomena.stargazingScore >= 7 ? GOOD : phenomena.stargazingScore >= 4 ? WARNING : DANGER
  const tiles = [
    {
      icon: '⭐', label: 'Stargazing',
      value: `${phenomena.stargazingScore.toFixed(1)}/10`,
      sub: phenomena.stargazingScore >= 7 ? 'Great' : phenomena.stargazingScore >= 4 ? 'Decent' : 'Poor',
      valueColor: starColor,
    },
    {
      icon: '🌅', label: 'Golden Hour',
      value: format(phenomena.goldenHourStart, 'h:mm a'),
      sub: phenomena.goldenHourQuality,
    },
    {
      icon: '🌙', label: 'Moonrise',
      value: lunar.rise ? format(lunar.rise, 'h:mm a') : 'Not tonight',
    },
    {
      icon: '🌄', label: 'Sunset Quality',
      value: `${phenomena.sunsetScore.toFixed(0)}/10`,
      sub: phenomena.sunsetScore >= 7 ? 'Spectacular' : phenomena.sunsetScore >= 4 ? 'Fair' : 'Muted',
    },
  ]

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <GlassCard key={tile.label} style={styles.tile}>
          <Text style={styles.icon}>{tile.icon}</Text>
          <Text style={styles.tileLabel}>{tile.label}</Text>
          <Text style={[styles.tileValue, tile.valueColor ? { color: tile.valueColor } : undefined]}>
            {tile.value}
          </Text>
          {tile.sub !== undefined && <Text style={styles.tileSub}>{tile.sub}</Text>}
        </GlassCard>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '48%', padding: 14, gap: 3 },
  icon: { fontSize: 24 },
  tileLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: TEXT_TERTIARY, marginTop: 4 },
  tileValue: { fontSize: 17, color: TEXT_PRIMARY, ...FONT_BOLD },
  tileSub: { fontSize: 12, color: TEXT_SECONDARY, ...FONT_REGULAR },
})
```

- [ ] **Step 5: Create `src/components/sky/RainbowAlert.tsx`**

```typescript
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { format } from 'date-fns'
import GlassCard from '@/src/components/shared/GlassCard'
import type { RainbowWindow } from '@/src/types/weather'
import { TEXT_PRIMARY, TEXT_SECONDARY } from '@/src/theme/colors'
import { FONT_BOLD, FONT_REGULAR } from '@/src/theme/typography'

interface Props {
  window: RainbowWindow
}

export default function RainbowAlert({ window: win }: Props) {
  return (
    <GlassCard style={styles.card}>
      <Text style={styles.emoji}>🌈</Text>
      <View style={styles.text}>
        <Text style={styles.title}>Rainbow likely around {format(win.likelyAt, 'h:mm a')}</Text>
        <Text style={styles.sub}>Face {win.faceDirection} — opposite the sun</Text>
      </View>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  emoji: { fontSize: 28 },
  text: { flex: 1 },
  title: { fontSize: 14, color: TEXT_PRIMARY, ...FONT_BOLD },
  sub: { fontSize: 12, color: TEXT_SECONDARY, ...FONT_REGULAR, marginTop: 2 },
})
```

- [ ] **Step 6: Create `src/components/sky/SunsetBar.tsx`**

```typescript
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import GlassCard from '@/src/components/shared/GlassCard'
import SectionLabel from '@/src/components/shared/SectionLabel'
import { TEXT_PRIMARY, ACCENT } from '@/src/theme/colors'
import { FONT_BOLD } from '@/src/theme/typography'

const DOT_COLORS = ['#FF6B6B', '#FF9944', '#FFD166', '#f5a623', '#ffd98a']

interface Props {
  score: number
}

export default function SunsetBar({ score }: Props) {
  const label =
    score >= 8 ? 'Spectacular' : score >= 6 ? 'Colourful' : score >= 4 ? 'Fair' : 'Muted'
  const filledDots = Math.round(score / 2)

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <SectionLabel text="Sunset Quality" />
        <Text style={styles.score}>{score}/10</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.dots}>
        {DOT_COLORS.map((color, i) => (
          <View
            key={i}
            style={[styles.dot, { backgroundColor: i < filledDots ? color : 'rgba(255,255,255,0.08)' }]}
          />
        ))}
      </View>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  score: { fontSize: 14, color: ACCENT, ...FONT_BOLD },
  label: { fontSize: 15, color: TEXT_PRIMARY, ...FONT_BOLD },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 20, height: 20, borderRadius: 10 },
})
```

- [ ] **Step 7: Create `src/components/sky/SkyTiles.test.tsx`**

```typescript
import React from 'react'
import renderer from 'react-test-renderer'
import SkyTiles from './SkyTiles'
import type { SkyPhenomena, LunarData } from '@/src/types/weather'

const phenomena: SkyPhenomena = {
  stargazingScore: 8, sunsetScore: 7,
  goldenHourStart: new Date('2026-04-19T19:45:00'),
  goldenHourEnd: new Date('2026-04-19T20:15:00'),
  goldenHourQuality: 'Good', rainbowWindow: null,
}
const lunar: LunarData = {
  phaseName: 'Waxing Crescent', illumination: 0.25, phaseAngle: 0.2,
  rise: new Date('2026-04-19T10:00:00'), set: new Date('2026-04-19T22:00:00'),
  nextFullMoon: new Date('2026-05-13'), nextNewMoon: new Date('2026-04-27'),
}

describe('SkyTiles', () => {
  it('renders all 4 tiles', () => {
    const json = JSON.stringify(renderer.create(<SkyTiles phenomena={phenomena} lunar={lunar} />).toJSON())
    expect(json).toMatch(/Stargazing/)
    expect(json).toMatch(/Golden Hour/)
    expect(json).toMatch(/Moonrise/)
    expect(json).toMatch(/Sunset Quality/)
  })
})
```

- [ ] **Step 8: Run all sky component tests — expect pass**

```bash
npx jest src/components/sky/
```

Expected: PASS (5 tests)

- [ ] **Step 9: Commit**

```bash
git add src/components/sky/
git commit -m "feat: Sky tab components — MoonHero, SkyTiles, RainbowAlert, SunsetBar"
```

---

## Task 11: Sky Tab Screen + Navigation

**Files:**
- Create: `app/(tabs)/sky.tsx`
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `src/components/navigation/StitchTabBar.tsx`

- [ ] **Step 1: Create `app/(tabs)/sky.tsx`**

```typescript
import React from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, StatusBar } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocationStore } from '@/src/store/locationStore'
import { useWeather } from '@/src/hooks/useWeather'
import { useLunar } from '@/src/hooks/useLunar'
import { useSkyPhenomena } from '@/src/hooks/useSkyPhenomena'
import MoonHero from '@/src/components/sky/MoonHero'
import SkyTiles from '@/src/components/sky/SkyTiles'
import RainbowAlert from '@/src/components/sky/RainbowAlert'
import SunsetBar from '@/src/components/sky/SunsetBar'
import SectionLabel from '@/src/components/shared/SectionLabel'
import { BG, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY } from '@/src/theme/colors'
import { FONT_BOLD } from '@/src/theme/typography'

export default function SkyScreen() {
  const { lat, lon } = useLocationStore()
  const { data: weather, isLoading } = useWeather(lat, lon)
  const lunar = useLunar(lat, lon)
  const phenomena = useSkyPhenomena(weather?.hourly, lat, lon)

  if (isLoading || !weather || !lunar || !phenomena) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color={TEXT_SECONDARY} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Sky</Text>
        <MoonHero lunar={lunar} />
        <SectionLabel text="Sky Conditions" />
        <SkyTiles phenomena={phenomena} lunar={lunar} />
        {phenomena.rainbowWindow !== null && (
          <RainbowAlert window={phenomena.rainbowWindow} />
        )}
        <SunsetBar score={phenomena.sunsetScore} />
        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by suncalc + Open-Meteo</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 120, gap: 16 },
  header: { fontSize: 28, color: TEXT_PRIMARY, marginTop: 8, marginBottom: 4, ...FONT_BOLD },
  footer: { alignItems: 'center', paddingTop: 8 },
  footerText: { fontSize: 11, color: TEXT_TERTIARY },
})
```

- [ ] **Step 2: Update `app/(tabs)/_layout.tsx`** — replace `two` with `sky`

Change:
```typescript
      <Tabs.Screen name="two" options={{ href: null }} />
```

To:
```typescript
      <Tabs.Screen name="sky" options={{ title: 'Sky' }} />
```

The full updated file:

```typescript
import React from 'react'
import { Tabs } from 'expo-router'
import StitchTabBar from '@/src/components/navigation/StitchTabBar'
import { BG } from '@/src/theme/colors'

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <StitchTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        sceneStyle: { backgroundColor: BG },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="radar" options={{ title: 'Radar' }} />
      <Tabs.Screen name="air" options={{ title: 'Air' }} />
      <Tabs.Screen name="sky" options={{ title: 'Sky' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  )
}
```

- [ ] **Step 3: Update `src/components/navigation/StitchTabBar.tsx`** — add sky icon and remove `two` guard

Change the `TAB_ICONS` record to add `sky`:

```typescript
const TAB_ICONS: Record<string, { active: IoniconName; idle: IoniconName }> = {
  index: { active: 'home', idle: 'home-outline' },
  radar: { active: 'radio', idle: 'radio-outline' },
  air: { active: 'leaf', idle: 'leaf-outline' },
  sky: { active: 'moon', idle: 'moon-outline' },
  more: { active: 'ellipsis-horizontal', idle: 'ellipsis-horizontal' },
}
```

Change the guard from `if (route.name === 'two') return null` to remove it entirely (the `two` tab no longer exists).

- [ ] **Step 4: Verify TypeScript + start app to confirm Sky tab renders**

```bash
npx tsc --noEmit
```

Then start the app: `npx expo start` and navigate to the Sky tab.

- [ ] **Step 5: Commit**

```bash
git add app/(tabs)/sky.tsx app/(tabs)/_layout.tsx src/components/navigation/StitchTabBar.tsx
git commit -m "feat: add Sky tab screen with moon hero, sky tiles, sunset bar"
```

---

## Task 12: Air Tab — AllergyRiskIndex + PollenTrendChart

**Files:**
- Create: `src/components/air/AllergyRiskIndex.tsx` + `.test.tsx`
- Create: `src/components/air/PollenTrendChart.tsx` + `.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/air/AllergyRiskIndex.test.tsx`:

```typescript
import React from 'react'
import renderer from 'react-test-renderer'
import AllergyRiskIndex from './AllergyRiskIndex'
import type { AllergyRiskData } from '@/src/types/weather'

describe('AllergyRiskIndex', () => {
  it('renders Low risk with no dominant allergen', () => {
    const risk: AllergyRiskData = { label: 'Low', score: 0, dominantAllergen: null }
    const json = JSON.stringify(renderer.create(<AllergyRiskIndex risk={risk} />).toJSON())
    expect(json).toMatch(/Low/)
  })

  it('renders High risk with Grass dominant', () => {
    const risk: AllergyRiskData = { label: 'High', score: 2.8, dominantAllergen: 'Grass' }
    const json = JSON.stringify(renderer.create(<AllergyRiskIndex risk={risk} />).toJSON())
    expect(json).toMatch(/High/)
    expect(json).toMatch(/Grass/)
  })
})
```

Create `src/components/air/PollenTrendChart.test.tsx`:

```typescript
import React from 'react'
import renderer from 'react-test-renderer'
import PollenTrendChart from './PollenTrendChart'
import type { AirQualityData } from '@/src/types/weather'

function makeHourly(): AirQualityData['hourly'] {
  const n = 48
  return {
    time: Array(n).fill('2026-04-19T00:00'),
    pm10: Array(n).fill(5), pm25: Array(n).fill(3), no2: Array(n).fill(10), ozone: Array(n).fill(40),
    alderPollen: Array(n).fill(null), birchPollen: Array(n).fill(null),
    grassPollen: Array(n).fill(20), mugwortPollen: Array(n).fill(null),
    olivePollen: Array(n).fill(null), ragweedPollen: Array(n).fill(null),
  }
}

describe('PollenTrendChart', () => {
  it('renders Grass row when grass pollen is present', () => {
    const json = JSON.stringify(renderer.create(
      <PollenTrendChart hourly={makeHourly()} currentHourIdx={0} />
    ).toJSON())
    expect(json).toMatch(/Grass/)
  })

  it('returns null when all pollen is null', () => {
    const h = makeHourly()
    const nullHourly = { ...h, grassPollen: Array(48).fill(null) as (number | null)[] }
    const tree = renderer.create(<PollenTrendChart hourly={nullHourly} currentHourIdx={0} />).toJSON()
    expect(tree).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
npx jest src/components/air/AllergyRiskIndex.test.tsx src/components/air/PollenTrendChart.test.tsx
```

- [ ] **Step 3: Create `src/components/air/AllergyRiskIndex.tsx`**

```typescript
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import GlassCard from '@/src/components/shared/GlassCard'
import SectionLabel from '@/src/components/shared/SectionLabel'
import type { AllergyRiskData } from '@/src/types/weather'
import { GOOD, WARNING, DANGER, TEXT_PRIMARY, TEXT_SECONDARY } from '@/src/theme/colors'
import { FONT_BOLD, FONT_REGULAR } from '@/src/theme/typography'

function riskColor(label: AllergyRiskData['label']): string {
  if (label === 'Low') return GOOD
  if (label === 'Moderate') return WARNING
  if (label === 'High') return '#FF9944'
  return DANGER
}

interface Props {
  risk: AllergyRiskData
}

export default function AllergyRiskIndex({ risk }: Props) {
  const color = riskColor(risk.label)
  const fillFlex = Math.max(0.05, Math.min(1, risk.score / 4))

  return (
    <GlassCard style={styles.card}>
      <SectionLabel text="Allergy Risk" />
      <View style={styles.row}>
        <Text style={[styles.label, { color }]}>{risk.label}</Text>
        {risk.dominantAllergen !== null && (
          <Text style={styles.dominant}>{risk.dominantAllergen} dominant</Text>
        )}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { flex: fillFlex, backgroundColor: color }]} />
        <View style={{ flex: 1 - fillFlex }} />
      </View>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  label: { fontSize: 22, ...FONT_BOLD },
  dominant: { fontSize: 13, color: TEXT_SECONDARY, ...FONT_REGULAR },
  track: {
    height: 4, borderRadius: 2, flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
  },
  fill: { height: 4, borderRadius: 2 },
})
```

- [ ] **Step 4: Create `src/components/air/PollenTrendChart.tsx`**

```typescript
import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import Svg, { Rect } from 'react-native-svg'
import type { AirQualityData } from '@/src/types/weather'
import { describePollenLevel } from '@/src/utils/weatherDescriptions'
import { GOOD, WARNING, DANGER, TEXT_TERTIARY } from '@/src/theme/colors'
import { FONT_SEMIBOLD } from '@/src/theme/typography'

const LEVEL_COLOR: Record<ReturnType<typeof describePollenLevel>, string> = {
  None: 'rgba(255,255,255,0.08)',
  Low: GOOD,
  Moderate: WARNING,
  High: '#FF9944',
  'Very High': DANGER,
}

type AllergenKey = keyof Pick<
  AirQualityData['hourly'],
  'grassPollen' | 'birchPollen' | 'alderPollen' | 'ragweedPollen'
>

const ALLERGENS: { key: AllergenKey; label: string }[] = [
  { key: 'grassPollen', label: 'Grass' },
  { key: 'birchPollen', label: 'Birch' },
  { key: 'alderPollen', label: 'Alder' },
  { key: 'ragweedPollen', label: 'Ragweed' },
]

interface Props {
  hourly: AirQualityData['hourly']
  currentHourIdx: number
}

const BAR_W = 8
const BAR_GAP = 2
const CHART_H = 32

export default function PollenTrendChart({ hourly, currentHourIdx }: Props) {
  const rows = ALLERGENS.filter(({ key }) =>
    hourly[key].slice(currentHourIdx, currentHourIdx + 24).some((v) => v !== null),
  )

  if (rows.length === 0) return null

  const hours = 24
  const totalW = hours * (BAR_W + BAR_GAP)

  return (
    <View style={styles.container}>
      {rows.map(({ key, label }) => {
        const values = hourly[key].slice(currentHourIdx, currentHourIdx + hours)
        const maxVal = Math.max(...values.map((v) => v ?? 0), 1)
        return (
          <View key={key} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Svg width={totalW} height={CHART_H}>
                {values.map((v, i) => {
                  const val = v ?? 0
                  const h = (val / maxVal) * CHART_H
                  const color = LEVEL_COLOR[describePollenLevel(v)]
                  return (
                    <Rect
                      key={i}
                      x={i * (BAR_W + BAR_GAP)}
                      y={CHART_H - Math.max(2, h)}
                      width={BAR_W}
                      height={Math.max(2, h)}
                      rx={2}
                      fill={color}
                      opacity={0.85}
                    />
                  )
                })}
              </Svg>
            </ScrollView>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { width: 52, fontSize: 11, color: TEXT_TERTIARY, ...FONT_SEMIBOLD },
})
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx jest src/components/air/AllergyRiskIndex.test.tsx src/components/air/PollenTrendChart.test.tsx
```

Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/air/AllergyRiskIndex.tsx src/components/air/AllergyRiskIndex.test.tsx src/components/air/PollenTrendChart.tsx src/components/air/PollenTrendChart.test.tsx
git commit -m "feat: AllergyRiskIndex and PollenTrendChart air components"
```

---

## Task 13: Integrate Into Home Screen

**Files:**
- Modify: `app/(tabs)/index.tsx`

Add PersonaSwitcher (below location header), RainProbabilityBar (after HourlyStrip), SafetyAlertBadge (below hero temp), and PersonaInsightCard (before MetricTilesGrid). Also call `useWeatherAlerts`.

- [ ] **Step 1: Add imports to `app/(tabs)/index.tsx`**

Add after the existing imports:

```typescript
import PersonaSwitcher from '@/src/components/home/PersonaSwitcher'
import RainProbabilityBar from '@/src/components/home/RainProbabilityBar'
import PersonaInsightCard from '@/src/components/home/PersonaInsightCard'
import SafetyAlertBadge from '@/src/components/home/SafetyAlertBadge'
import { useWeatherAlerts } from '@/src/hooks/useWeatherAlerts'
import { useAirQuality } from '@/src/hooks/useAirQuality'
```

- [ ] **Step 2: Call `useWeatherAlerts` and `useAirQuality` inside `HomeScreen`**

After the existing `useWeather` call (around line 66), add:

```typescript
  const { data: air } = useAirQuality(lat, lon)
  const alerts = useWeatherAlerts(lat, lon, weather?.current.weatherCode, weather?.current.precipitationProbability)
```

Also add a `currentHourIdx` helper near the top of the component body:

```typescript
  const currentHourIdx = React.useMemo(() => {
    if (!weather?.hourly.time) return 0
    const prefix = new Date().toISOString().slice(0, 13)
    const idx = weather.hourly.time.findIndex((t) => t.startsWith(prefix))
    return idx === -1 ? 0 : idx
  }, [weather?.hourly.time])
```

- [ ] **Step 3: Insert components in the JSX**

Find the location header section and add `<PersonaSwitcher />` directly below it (before the rain bar / hero temp area). Find where `<HourlyStrip />` is rendered and add `<RainProbabilityBar hourly={weather.hourly} />` after it. Add `<SafetyAlertBadge alerts={alerts} />` below the hero temperature display. Add `<PersonaInsightCard />` before `<MetricTilesGrid />`:

```typescript
{/* Below location header */}
<PersonaSwitcher />

{/* Below hero temperature */}
<SafetyAlertBadge alerts={alerts} />

{/* After HourlyStrip */}
<RainProbabilityBar hourly={weather.hourly} />

{/* Before MetricTilesGrid */}
{air && (
  <PersonaInsightCard
    hourly={weather.hourly}
    daily={weather.daily}
    airHourly={air.hourly}
    today={new Date().toISOString().slice(0, 10)}
    currentHourIdx={currentHourIdx}
    humidity={weather.current.humidity}
    windSpeed={weather.current.windSpeed}
    uvIndex={weather.current.uvIndex}
    usAqi={air.current.usAqi}
  />
)}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: integrate persona switcher, rain bar, safety alerts, insight card into Home screen"
```

---

## Task 14: Integrate Into Air Screen

**Files:**
- Modify: `app/(tabs)/air.tsx`

Add `AllergyRiskIndex` and `PollenTrendChart` to the Air tab. These sit after the existing `PollenBars` component.

- [ ] **Step 1: Add imports to `app/(tabs)/air.tsx`**

```typescript
import AllergyRiskIndex from '@/src/components/air/AllergyRiskIndex'
import PollenTrendChart from '@/src/components/air/PollenTrendChart'
import { computeAllergyRisk } from '@/src/utils/allergyRisk'
import { useWeather } from '@/src/hooks/useWeather'
```

(Note: `useWeather` may already be imported — check first.)

- [ ] **Step 2: Compute allergy risk inside the screen component**

After `getCurrentHourIdx` is called, add:

```typescript
  const allergyRisk = React.useMemo(() => {
    if (!air?.hourly || !weather?.current) return null
    return computeAllergyRisk(
      air.hourly,
      currentHourIdx,
      weather.current.humidity,
      weather.current.windSpeed,
    )
  }, [air?.hourly, currentHourIdx, weather?.current])
```

- [ ] **Step 3: Insert components in the JSX**

After the existing `<PollenBars />` component, add:

```typescript
{allergyRisk && (
  <AllergyRiskIndex risk={allergyRisk} />
)}
{air?.hourly && (
  <>
    <SectionLabel text="24h Pollen Trend" />
    <PollenTrendChart hourly={air.hourly} currentHourIdx={currentHourIdx} />
  </>
)}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/(tabs)/air.tsx
git commit -m "feat: add AllergyRiskIndex and PollenTrendChart to Air screen"
```

---

## Task 15: Integrate Pressure Alert Into More Screen

**Files:**
- Modify: `app/(tabs)/more.tsx`

Add a pressure headache alert card in the Health & Comfort section of the More screen.

- [ ] **Step 1: Add imports to `app/(tabs)/more.tsx`**

```typescript
import { usePressureAlert } from '@/src/hooks/usePressureAlert'
```

- [ ] **Step 2: Call `usePressureAlert` inside the screen component**

After the existing `useWeather` call:

```typescript
  const pressureAlert = usePressureAlert(weather?.hourly)
```

- [ ] **Step 3: Add the pressure alert card to the JSX**

Find the Health & Comfort section in the More screen (search for `healthInsights` or similar). Add after it:

```typescript
{pressureAlert.alert && (
  <GlassCard style={styles.pressureCard}>
    <View style={styles.pressureRow}>
      <Ionicons
        name="warning-outline"
        size={18}
        color={WARNING}
      />
      <Text style={styles.pressureTitle}>
        {pressureAlert.direction === 'falling'
          ? 'Pressure Dropping Fast'
          : 'Pressure Rising Fast'}
      </Text>
    </View>
    <Text style={styles.pressureBody}>
      {pressureAlert.direction === 'falling'
        ? 'Pressure dropping fast — headache or migraine risk elevated this afternoon.'
        : 'Pressure rising sharply — some people experience head pressure during rapid rises.'}
    </Text>
  </GlassCard>
)}
```

Add the corresponding styles to the StyleSheet:

```typescript
  pressureCard: { padding: 16, gap: 8 },
  pressureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pressureTitle: { fontSize: 15, color: WARNING, ...FONT_BOLD },
  pressureBody: { fontSize: 13, color: TEXT_SECONDARY, lineHeight: 18, ...FONT_REGULAR },
```

Add `WARNING` to the colors import if not already present.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Run all tests**

```bash
npx jest --passWithNoTests
```

Expected: all existing + new tests pass.

- [ ] **Step 6: Final commit**

```bash
git add app/(tabs)/more.tsx
git commit -m "feat: pressure headache alert card in More screen"
```

---

## Self-Review Checklist

After all tasks are complete, verify against the spec:

| Spec requirement | Task |
|-----------------|------|
| Persona switcher (2-pill toggle, amber active state) | Task 8, 13 |
| Rain probability bar (12 segments, 15-min intervals, hidden < 10%) | Task 8, 13 |
| Safety alerts (NWS + weathercode ≥ 95 + precip > 85%) | Task 7, 9, 13 |
| Sky tab: MoonHero (phase, illumination, rise/set, next full/new) | Task 10, 11 |
| Sky tab: SkyTiles (2×2 grid: stargazing, golden hour, moonrise, sunset quality) | Task 10, 11 |
| Sky tab: RainbowAlert (precip > 40% → < 20%, sun altitude 20–42°, cloud < 60%) | Task 4, 10, 11 |
| Sky tab: SunsetBar (0–10 score, dot display) | Task 10, 11 |
| Stargazing score formula: base 10 − cloud/10 − moon×3 + vis/20 bonus | Task 4 |
| Sunset quality formula: 5 pts base, cloud/humidity/weathercode bonuses | Task 4 |
| AllergyRisk composite (maxPollen × humidityMult + windPenalty) | Task 5, 12, 14 |
| 24h Pollen Trend Chart (react-native-svg bars, 4 allergen rows) | Task 12, 14 |
| Pressure headache alert (drop > 8 hPa or rise > 10 hPa in 3h window) | Task 5, 7, 15 |
| PersonaInsightCard (athlete: best activity window; wellness: pollen+AQI+UV) | Task 9, 13 |
| surface_pressure in hourly API call | Task 2 |
| suncalc npm dep installed | Task 1 |

---

**Plan complete. Two execution options:**

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks

**2. Inline Execution** — execute tasks in this session using executing-plans skill

**Which approach?**
