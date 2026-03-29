# Skycast — Weather App

## Project overview
A free, ad-free weather app for iOS and Android that beats Apple Weather and
Samsung Weather by offering plain-language summaries, pollen by allergen type,
7-day activity forecasts, health correlations, and 14-day forecasts.
All data comes from Open-Meteo — completely free, no API key needed.

## Tech stack
- Expo SDK 54, React Native, TypeScript (strict mode, no `any` ever)
- Expo Router v6 for file-based navigation (tabs template)
- NativeWind v4 + Tailwind CSS v3.3 for styling
- Zustand for global state (location, user preferences, alert thresholds)
- @tanstack/react-query for all API fetching and caching
- @expo/vector-icons (Ionicons set) for all icons
- date-fns for all date formatting

## Folder structure
```
skycast/
├── app/                        ← Expo Router screens (file-based routing)
│   ├── (tabs)/
│   │   ├── index.tsx           ← Home screen
│   │   ├── radar.tsx           ← Radar map screen
│   │   ├── air.tsx             ← Air quality & pollen screen
│   │   └── more.tsx            ← Activities, history, health, alerts
│   └── _layout.tsx             ← Root layout
├── src/
│   ├── api/
│   │   ├── openMeteo.ts        ← Weather + forecast fetcher
│   │   └── airQuality.ts       ← AQI + pollen fetcher
│   ├── components/
│   │   ├── home/
│   │   │   ├── DailyBriefCard.tsx
│   │   │   ├── HourlyStrip.tsx
│   │   │   ├── ForecastList.tsx
│   │   │   └── MetricTilesGrid.tsx
│   │   ├── air/
│   │   │   ├── AQIGauge.tsx
│   │   │   ├── PollenBars.tsx
│   │   │   └── PollutantList.tsx
│   │   ├── activities/
│   │   │   └── ActivityScoreRow.tsx
│   │   └── shared/
│   │       ├── GlassCard.tsx   ← Reusable frosted glass card
│   │       └── SectionLabel.tsx
│   ├── hooks/
│   │   ├── useWeather.ts       ← Wraps React Query + openMeteo.ts
│   │   ├── useAirQuality.ts    ← Wraps React Query + airQuality.ts
│   │   └── useLocation.ts      ← Expo Location wrapper
│   ├── store/
│   │   ├── locationStore.ts    ← Current lat/lon, city name
│   │   └── prefsStore.ts       ← Units (°C/°F), alert thresholds
│   ├── utils/
│   │   ├── weatherDescriptions.ts  ← Plain-English metric descriptions
│   │   ├── dailyBrief.ts           ← Generates 1-2 sentence daily summary
│   │   ├── activityScores.ts       ← Scores 10 activities 0-10
│   │   └── weatherCodes.ts         ← WMO code → label + icon name
│   └── types/
│       └── weather.ts          ← All TypeScript interfaces
```

## Design system (apply to every component)
- Background: `#0A0F1E` (deep navy)
- Glass card: `backgroundColor: 'rgba(255,255,255,0.08)'`,
  `borderColor: 'rgba(255,255,255,0.12)'`, `borderRadius: 20`, `borderWidth: 1`
- Primary text: `#FFFFFF`
- Secondary text: `rgba(255,255,255,0.65)`
- Tertiary text: `rgba(255,255,255,0.40)`
- Accent blue: `#4A9EFF`
- Good/green: `#06D6A0`
- Warning/amber: `#FFD166`
- Danger/red: `#FF6B6B`
- Temperature display: fontSize 72, fontWeight '200'
- Section labels: fontSize 11, fontWeight '600', letterSpacing 1.2,
  textTransform 'uppercase', color rgba(255,255,255,0.35)
- No drop shadows anywhere — depth comes from opacity layers only
- All border radii: 20 for cards, 12 for tiles, 8 for pills/badges

## API reference (Open-Meteo — no key, always free)

### Current + hourly + 14-day forecast (single request)
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}
  &longitude={lon}
  &current=temperature_2m,apparent_temperature,relative_humidity_2m,
           precipitation_probability,weathercode,windspeed_10m,
           winddirection_10m,windgusts_10m,surface_pressure,
           visibility,uv_index,cloud_cover
  &hourly=temperature_2m,apparent_temperature,precipitation_probability,
          precipitation,weathercode,windspeed_10m,windgusts_10m,
          uv_index,cloud_cover,visibility,relativehumidity_2m
  &daily=temperature_2m_max,temperature_2m_min,weathercode,
         precipitation_sum,precipitation_probability_max,
         windspeed_10m_max,windgusts_10m_max,uv_index_max,
         sunrise,sunset
  &forecast_days=14
  &timezone=auto
```

### Air quality + pollen (single request)
```
GET https://air-quality-api.open-meteo.com/v1/air-quality
  ?latitude={lat}
  &longitude={lon}
  &current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,
           sulphur_dioxide,us_aqi,european_aqi
  &hourly=pm10,pm2_5,nitrogen_dioxide,ozone,
          alder_pollen,birch_pollen,grass_pollen,
          mugwort_pollen,olive_pollen,ragweed_pollen
  &timezone=auto
```

### Historical weather
```
GET https://archive-api.open-meteo.com/v1/era5
  ?latitude={lat}
  &longitude={lon}
  &start_date=YYYY-MM-DD
  &end_date=YYYY-MM-DD
  &daily=temperature_2m_max,temperature_2m_min,precipitation_sum,
         windspeed_10m_max
  &timezone=auto
```

## React Query config
- staleTime: 5 * 60 * 1000 (5 minutes)
- refetchInterval: 10 * 60 * 1000 (10 minutes)
- retry: 2
- All query keys: ['weather', lat, lon] and ['airQuality', lat, lon]

## Zustand stores

### locationStore
```typescript
interface LocationStore {
  lat: number | null
  lon: number | null
  cityName: string
  setLocation: (lat: number, lon: number, cityName: string) => void
}
```

### prefsStore
```typescript
interface PrefsStore {
  unit: 'C' | 'F'
  rainThreshold: number      // default 60 (%)
  windThreshold: number      // default 50 (km/h)
  uvThreshold: number        // default 7
  alertsEnabled: {
    rain: boolean
    uv: boolean
    pollen: boolean
    severe: boolean
  }
  setUnit: (unit: 'C' | 'F') => void
  setThreshold: (key: string, value: number) => void
  toggleAlert: (key: string) => void
}
```

## TypeScript interfaces (src/types/weather.ts)
```typescript
export interface CurrentWeather {
  temperature: number
  apparentTemperature: number
  humidity: number
  precipitationProbability: number
  weatherCode: number
  windSpeed: number
  windDirection: number
  windGusts: number
  pressure: number
  visibility: number
  uvIndex: number
  cloudCover: number
}

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
}

export interface DailyWeather {
  time: string[]
  tempMax: number[]
  tempMin: number[]
  weatherCode: number[]
  precipitationSum: number[]
  precipitationProbabilityMax: number[]
  windSpeedMax: number[]
  windGustsMax: number[]
  uvIndexMax: number[]
  sunrise: string[]
  sunset: string[]
}

export interface AirQualityData {
  current: {
    pm10: number
    pm25: number
    co: number
    no2: number
    ozone: number
    so2: number
    usAqi: number
    europeanAqi: number
  }
  hourly: {
    time: string[]
    pm10: number[]
    pm25: number[]
    no2: number[]
    ozone: number[]
    alderPollen: number[]
    birchPollen: number[]
    grassPollen: number[]
    mugwortPollen: number[]
    olivePollen: number[]
    ragweedPollen: number[]
  }
}

export interface ActivityScore {
  score: number               // 0-10
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Avoid'
  reason: string              // 1 short sentence
  bestWindow?: string         // e.g. "Best 7–10 AM"
  color: string               // hex color for the score
}
```

## weatherDescriptions.ts — must implement these functions
```typescript
describeHumidity(percent: number): string
describeWind(kmh: number): string
describeUV(index: number): string
describePressure(hpa: number, trend: 'rising' | 'falling' | 'steady'): string
describeVisibility(km: number): string
describeAQI(aqi: number): { label: string; color: string; advice: string }
describePollenLevel(count: number | null): 'None' | 'Low' | 'Moderate' | 'High' | 'Very High'
```

## activityScores.ts — must implement these 10 activities
Running, Cycling, Hiking, Photography, Outdoor Dining, Gardening,
Beach, Stargazing (post-sunset only), BBQ, Dog Walking

Each takes (hourly: HourlyWeather, daily: DailyWeather, targetDate: string)
and returns ActivityScore.

## dailyBrief.ts — generateDailyBrief function
Input: current weather + today's hourly data
Output: string, max 180 chars, 1-2 sentences
Rules:
- Never mention raw numbers — describe meaning only
- If rain likely: "Rain expected [time range] — [duration hint]."
- If clear all day: "Clear skies all day — [activity suggestion]."
- Append UV/wind warnings if severe
- Morning hint: "Good morning for [activity]." or "Skip the [activity] — [reason]."

## Code rules
1. TypeScript strict — zero `any`, always type everything
2. Never fetch() directly in a component — always go through React Query hooks
3. Every component must have a corresponding .test.tsx file
4. Run /tdd before implementing any new feature
5. Run /code-review after completing each screen
6. All temperatures displayed via formatTemp(value, unit) helper — never raw
7. Use Ionicons from @expo/vector-icons for all icons
8. NativeWind classes for layout, inline StyleSheet only for dynamic values
   (e.g. animated widths, opacity driven by data)
9. GlassCard component must be used for every card in the app — never
   duplicate the glass card styles inline
