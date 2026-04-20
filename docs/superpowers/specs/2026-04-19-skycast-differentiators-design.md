# Skycast Differentiators — Design Spec
**Date:** 2026-04-19  
**Status:** Approved  
**Strategy:** AI-first · Persona-aware · Apple-parity · Free backbone + OpenAI premium

---

## 1. Goals & Positioning

Beat Apple Weather and Samsung Weather by being the first weather app with a real conversational AI layer, while covering every parity feature Apple has (lunar, safety alerts, hyperlocal, quirky phenomena alerts) and targeting two underserved user segments:

- **Athlete persona** — outdoor runners, cyclists, hikers who need precision timing and activity windows
- **Wellness persona** — allergy sufferers, UV-sensitive, migraine-prone users who need health-weather correlation

**Key differentiator:** Neither Apple nor Samsung has an LLM layer. Skycast's AI assistant is persona-aware, knows your health sensitivities and routine, and gives genuinely actionable answers — not just raw data.

---

## 2. Architecture Overview

### 2.1 Navigation Changes

A 5th tab **Sky** replaces the existing `two.tsx` placeholder. Tab order:

| # | Tab | Screen file | Purpose |
|---|-----|-------------|---------|
| 1 | Home | `app/(tabs)/index.tsx` | Current + hourly + 14-day + persona + rain bar |
| 2 | Radar | `app/(tabs)/radar.tsx` | Map + globe + safety alert overlay |
| 3 | Air | `app/(tabs)/air.tsx` | AQI + pollen + allergy risk index |
| 4 | Sky | `app/(tabs)/sky.tsx` *(new)* | Moon + stargazing + golden hour + phenomena |
| 5 | More | `app/(tabs)/more.tsx` | Activities + AI chat + alerts + settings |

### 2.2 New Stores

**`src/store/personaStore.ts`**
```typescript
interface PersonaStore {
  persona: 'athlete' | 'wellness'
  setPersona: (p: 'athlete' | 'wellness') => void
}
```
Persisted via `zustand/middleware/persist` + AsyncStorage. Default: `'athlete'`.

### 2.3 New Hooks

| Hook | Returns | Data source |
|------|---------|-------------|
| `useLunar(lat, lon)` | Moon phase, illumination, rise/set, next full/new moon | `suncalc` npm (pure JS) |
| `useSkyPhenomena(lat, lon)` | Stargazing score, golden hour window, sunset quality, rainbow alert | `suncalc` + Open-Meteo hourly |
| `useRainBar(hourly)` | 12 interpolated probability segments for next 3h | Open-Meteo 15-min resolution |
| `usePressureAlert(hourly)` | `{ alert: boolean, delta: number, direction: 'rising' \| 'falling' }` | Open-Meteo `surface_pressure` |

---

## 3. Feature Specifications

### 3.1 Persona Switcher (Home screen — free)

A two-pill toggle below the location header on the Home screen:

- `🏃 Athlete` — active state: amber tinted (`rgba(245,166,35,0.12)`, border `rgba(245,166,35,0.35)`)
- `💊 Wellness` — same style for active

When persona changes, the **Persona Insight Card** below the rain bar updates:
- **Athlete:** Best activity window for today (derived from activity scores + hourly forecast)
- **Wellness:** Top health concern for today (highest pollen type + AQI + UV combined)

### 3.2 Minute-by-Minute Rain Probability Bar (Home — free)

Horizontal bar of 12 segments representing the next 3 hours at 15-minute intervals. Uses Open-Meteo `hourly.precipitationProbability` — linearly interpolates between hourly values to approximate 15-min buckets.

Segment colour thresholds:
- `< 25%` → `rgba(123,191,255,0.12)` (dim)
- `25–50%` → `rgba(123,191,255,0.35)` (medium)
- `50–75%` → `rgba(123,191,255,0.65)` (high)
- `> 75%` → `#7bbfff` (peak, full secondary colour)

Shows peak % and estimated time in header. Hidden if `max(next 3h) < 10%`.

### 3.3 Safety Alerts (Home + Radar — free)

**Detection sources (in priority order):**
1. Open-Meteo `weathercode` ≥ 95 (thunderstorm / severe hail) → generate local alert
2. NWS API `https://api.weather.gov/alerts/active?point={lat},{lon}` (US only, free, no key)
3. Open-Meteo `precipitation_probability` spike > 85% combined with `weathercode` 65–67 (heavy rain)

**Display:**
- **Home:** Dismissible amber/red alert badge below hero temperature. Taps open a bottom sheet with alert description and a "See map" button that switches to Radar tab.
- **Radar:** Semi-transparent red polygon overlay on the map (NWS provides GeoJSON geometry for US alerts). For non-US or Open-Meteo-derived alerts, show a radius circle around the current location.

### 3.4 Sky Tab (new — free)

**Components:**

| Component | Data | Algorithm |
|-----------|------|-----------|
| `MoonHero` | Phase name, illumination %, rise/set times | `suncalc.getMoonIllumination()` + `getMoonTimes()` |
| `SkyTiles` (2×2 grid) | Stargazing score, Golden hour time, Moonrise, Next new moon | See scoring below |
| `RainbowAlert` | Alert with direction + time window | See rainbow detection |
| `SunsetBar` | Quality score 0–10 + colour dots | See sunset scoring |

**Stargazing score (0–10):**
```
base = 10
− (cloudCover / 10)          // cloud cover 0–100% → subtract 0–10
− (moonIllumination × 3)     // full moon = −3 pts
+ clamp(visibility / 20, 0, 1) // visibility bonus
clamped to [0, 10]
```

**Golden hour:**
`suncalc.getTimes()` gives `goldenHour` and `goldenHourEnd`. Quality: "Excellent" if cloud cover < 20%, "Good" < 50%, "Fair" otherwise.

**Rainbow detection:**
All three conditions must be true within the next 4 hours:
1. `precipitationProbability > 40%` followed by a period where it drops below 20%
2. Sun altitude between 20° and 42° (from `suncalc.getPosition()`)
3. Cloud cover < 60% in that window

Push notification: "🌈 Rainbow likely around [time] — face [compass direction opposite sun]."

**Sunset quality score (0–10):**
```
score = 5
+ (cloudCover between 20–50% ? +2 : 0)   // thin cloud = dramatic colours
− (cloudCover > 70% ? 3 : 0)              // overcast kills it
+ (humidity between 40–65% ? +1 : 0)     // moisture scatters light
+ (weathercode in [1,2,3] ? +1 : 0)      // partly cloudy codes
− (precipitationProbability > 50% ? 2 : 0)
clamped to [0, 10]
```

### 3.5 Air Tab Additions (free)

**Allergy Risk Index:** Composite of pollen + humidity + wind speed.
```
pollenScore = { None:0, Low:1, Moderate:2, High:3, VeryHigh:4 }
maxPollenScore = max across all 6 allergen types at current hour
humidityMultiplier = humidity > 70 ? 1.3 : 1.0
windPenalty = windSpeed > 20 ? −0.5 : 0
raw = (maxPollenScore × humidityMultiplier) + windPenalty
label = raw < 1 ? 'Low' : raw < 2 ? 'Moderate' : raw < 3 ? 'High' : 'Very High'
```

**24h Pollen Trend Chart:** Horizontal scrollable sparkline per allergen type. Uses `recharts` (already likely available) or a lightweight `react-native-svg` bar chart.

### 3.6 Pressure Headache Alerts (More — free)

Monitors `surface_pressure` across the next 12 hourly data points. Fires alert when:
- Pressure drop > 8 hPa within any 3-hour window, **or**
- Pressure rise > 10 hPa within any 3-hour window

Alert copy: "Pressure dropping fast — headache or migraine risk elevated this afternoon."  
Shown as a GlassCard in the More screen under Health & Comfort, and as a push notification if the user has enabled the `severe` alert toggle.

### 3.7 AI Chat Assistant (More — premium, OpenAI API)

**System prompt structure:**
```
You are Skycast AI, a personal weather assistant. 
Persona: {athlete | wellness}.
Current conditions: {temp, condition, wind, UV, humidity, pressure}.
48h forecast summary: {hourly precip%, pollen peak, AQI}.
User sensitivities: {from aiCoachStore.routine}.
Today's activity scores: {top 3 activities with scores}.
Answer in 2–4 short sentences. Be specific and actionable. No filler.
```

**Model routing:**
- `gpt-4o-mini` — chat, wardrobe advisor (fast, cheap ~$0.0002/call)
- `gpt-4o` — trip briefing, health correlation summary (~$0.01/call)

**Rate limit:** 20 queries/day per premium user (stored in AsyncStorage, reset at midnight local time). UI shows "18/20 queries used today" nudge at 90%.

**Three AI sub-features:**

1. **Chat** — free-form conversational Q&A, streamed response, quick-reply chips
2. **Wardrobe Advisor** — triggered by "What should I wear?" or a dedicated button. Returns structured list: top, bottom, footwear, accessories, UV/rain notes.
3. **Trip Weather Briefing** — user picks destination + date range → GPT-4o generates a narrative paragraph: expected conditions, day-by-day highlights, packing recommendations.

**Implementation:**
- `src/api/openai.ts` — OpenAI client, `buildWeatherContext()`, `routeModel()`, `streamChat()`
- API key stored in `EXPO_PUBLIC_OPENAI_API_KEY` environment variable (move server-side before production to avoid key exposure)
- `src/components/more/AIChatSheet.tsx` — bottom sheet, message list, input, quick chips
- `src/components/more/WardrobeAdvisorCard.tsx`
- `src/components/more/TripBriefingCard.tsx`

---

## 4. Monetization

### 4.1 Tier Structure

| Feature | Free | Premium |
|---------|------|---------|
| All current features | ✓ | ✓ |
| Persona switcher | ✓ | ✓ |
| Rain probability bar | ✓ | ✓ |
| Safety alerts | ✓ | ✓ |
| Sky tab (full) | ✓ | ✓ |
| Pressure headache alerts | ✓ | ✓ |
| Allergy risk index | ✓ | ✓ |
| AI Chat Assistant | — | ✓ |
| AI Wardrobe Advisor | — | ✓ |
| AI Trip Briefing | — | ✓ |
| Health-weather correlation log | — | ✓ |
| Forecast confidence ranges | — | ✓ |
| 21-day extended forecast | — | ✓ |
| Home screen widget pack | — | ✓ |
| Priority data refresh (5-min) | — | ✓ |

**Pricing:** $2.99/month · $19.99/year · 7-day free trial  
**Implementation:** RevenueCat SDK (handles App Store + Play Store subscriptions, free tier available)

### 4.2 Premium Gate UI

- AI features show a lock icon with "Unlock with Premium" tap target
- First tap → full-screen paywall with feature list + trial CTA
- No dark patterns — free tier is genuinely useful and not artificially crippled

---

## 5. Paid API Upgrade Path (at scale)

| API | Purpose | Trigger |
|-----|---------|---------|
| **OpenAI API** | AI Chat, Wardrobe, Trip Briefing | **Now** — needed for premium |
| **RevenueCat** | Subscription management | **Now** — before premium launch |
| **Tomorrow.io** | True minute-by-minute nowcasting (replaces Open-Meteo interpolation) | ~10K MAU |
| **Rainbow.ai** | Hyperlocal 1 km precipitation radar | ~10K MAU |
| **BreezoMeter** | Hyperlocal AQI (Apple uses this) | ~25K MAU |

---

## 6. New Files Summary

```
app/(tabs)/sky.tsx                          ← new Sky tab screen
src/store/personaStore.ts                   ← Zustand persona store
src/hooks/useLunar.ts                       ← suncalc moon data
src/hooks/useSkyPhenomena.ts                ← rainbow, sunset, golden hour
src/hooks/useRainBar.ts                     ← 15-min rain segments
src/hooks/usePressureAlert.ts               ← pressure delta detection
src/api/openai.ts                           ← OpenAI client + context builder
src/components/home/PersonaSwitcher.tsx     ← 2-pill persona toggle
src/components/home/RainProbabilityBar.tsx  ← 12-segment rain bar
src/components/home/PersonaInsightCard.tsx  ← athlete/wellness insight
src/components/home/SafetyAlertBadge.tsx    ← dismissible alert banner
src/components/sky/MoonHero.tsx             ← moon phase display
src/components/sky/SkyTiles.tsx             ← 2x2 tile grid
src/components/sky/RainbowAlert.tsx         ← rainbow alert card
src/components/sky/SunsetBar.tsx            ← sunset quality bar
src/components/air/AllergyRiskIndex.tsx     ← composite risk card
src/components/more/AIChatSheet.tsx         ← bottom sheet AI chat
src/components/more/WardrobeAdvisorCard.tsx ← wardrobe suggestions
src/components/more/TripBriefingCard.tsx    ← trip weather narrative
src/utils/skyPhenomena.ts                   ← rainbow/sunset/stargazing algos
src/utils/allergyRisk.ts                    ← allergy composite score
src/utils/pressureAlert.ts                  ← pressure delta logic
```

---

## 7. Out of Scope (deferred)

- Home screen widgets (requires native Expo widget module — complex, deferred post-v1)
- Health correlation log dashboard (requires persistent local data store — Phase 2)
- Forecast confidence ranges (requires Tomorrow.io probabilistic API — at scale)
- Apple Watch companion (separate project)
- 21-day extended forecast (Open-Meteo supports 16 days free; true 21-day needs paid tier)
