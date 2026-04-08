import { format, parseISO } from 'date-fns'
import type { AirQualityData, DailyWeather, HourlyWeather } from '@/src/types/weather'
import type { AlertsEnabled } from '@/src/store/prefsStore'
import type { UserRoutine } from '@/src/store/aiCoachStore'
import {
  scoreRunning,
  scoreCycling,
  scoreHiking,
  scoreOutdoorDining,
  scoreDogWalking,
} from '@/src/utils/activityScores'

type InsightPhase = 'phase1' | 'phase2' | 'phase3'
type InsightKind = 'daily' | 'activity' | 'notification' | 'health' | 'commute' | 'coach' | 'strategy'

export interface AIInsight {
  id: string
  phase: InsightPhase
  kind: InsightKind
  title: string
  message: string
  confidence: number
}

export interface SmartNotification {
  id: string
  type: 'rain' | 'uv' | 'wind' | 'pollen' | 'severe' | 'tomorrow'
  title: string
  body: string
  triggerAtIso: string
  priority: 'critical' | 'actionable' | 'helpful'
}

interface BuildInputs {
  hourly: HourlyWeather
  daily: DailyWeather
  airQuality?: AirQualityData
  alertsEnabled: AlertsEnabled
  thresholds: {
    rain: number
    uv: number
    wind: number
  }
  routine: UserRoutine
  now?: Date
}

interface ActivityConfig {
  key: 'running' | 'cycling' | 'hiking' | 'outdoorDining' | 'dogWalking'
  label: string
  scorer: (hourly: HourlyWeather, daily: DailyWeather, date: string) => { score: number; bestWindow?: string }
}

const ACTIVITY_CONFIG: ActivityConfig[] = [
  { key: 'running', label: 'Running', scorer: scoreRunning },
  { key: 'cycling', label: 'Cycling', scorer: scoreCycling },
  { key: 'hiking', label: 'Hiking', scorer: scoreHiking },
  { key: 'outdoorDining', label: 'Outdoor dining', scorer: scoreOutdoorDining },
  { key: 'dogWalking', label: 'Dog walking', scorer: scoreDogWalking },
]

function hourFromIso(iso: string): number {
  const match = iso.match(/T(\d{2}):/)
  return match ? Number.parseInt(match[1] ?? '0', 10) : 0
}

function toTodayDate(now: Date): string {
  return format(now, 'yyyy-MM-dd')
}

function toTomorrowDate(now: Date): string {
  const next = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return format(next, 'yyyy-MM-dd')
}

function findFirstIndex<T>(arr: T[], predicate: (value: T, index: number) => boolean): number {
  for (let i = 0; i < arr.length; i += 1) {
    if (predicate(arr[i] as T, i)) return i
  }
  return -1
}

export function buildActivityWindowInsights(inputs: BuildInputs): AIInsight[] {
  const today = toTodayDate(inputs.now ?? new Date())
  const top = ACTIVITY_CONFIG.map((cfg) => {
    const score = cfg.scorer(inputs.hourly, inputs.daily, today)
    return {
      ...cfg,
      score: score.score,
      bestWindow: score.bestWindow,
    }
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  return top.map((item, index) => ({
    id: `p1-activity-${item.key}-${index}`,
    phase: 'phase1',
    kind: 'activity',
    title: `${item.label} window`,
    message: item.bestWindow
      ? `${item.bestWindow}. ${item.label} conditions rate ${item.score}/10.`
      : `Conditions rate ${item.score}/10 today. Flexible timing is okay.`,
    confidence: 0.7 + Math.min(item.score, 10) * 0.02,
  }))
}

export function buildTomorrowHeadsUp(inputs: BuildInputs): AIInsight | null {
  const tomorrow = toTomorrowDate(inputs.now ?? new Date())
  const dailyIndex = inputs.daily.time.findIndex((d) => d === tomorrow)
  if (dailyIndex < 0) return null

  const rain = inputs.daily.precipitationProbabilityMax[dailyIndex] ?? 0
  const uv = inputs.daily.uvIndexMax[dailyIndex] ?? 0
  const gust = inputs.daily.windGustsMax[dailyIndex] ?? 0
  const topRisk =
    rain >= Math.max(uv, gust) ? 'rain' : uv >= Math.max(rain, gust) ? 'uv' : 'wind'

  const headline =
    topRisk === 'rain'
      ? `Tomorrow looks wet (${rain}% peak chance).`
      : topRisk === 'uv'
        ? `Tomorrow UV peaks high around ${Math.round(uv)}.`
        : `Tomorrow brings gusty periods up to ${Math.round(gust)} km/h.`

  return {
    id: 'p1-tomorrow-headsup',
    phase: 'phase1',
    kind: 'daily',
    title: 'Tomorrow heads-up',
    message: `${headline} Best to front-load outdoor plans.`,
    confidence: 0.78,
  }
}

export function buildSmartNotifications(inputs: BuildInputs): SmartNotification[] {
  const now = inputs.now ?? new Date()
  const notifications: SmartNotification[] = []
  const tomorrowSummary = buildTomorrowHeadsUp(inputs)
  const todayDate = toTodayDate(now)

  const nextRainIdx = findFirstIndex(
    inputs.hourly.time,
    (iso, i) =>
      iso.startsWith(todayDate) &&
      inputs.alertsEnabled.rain &&
      (inputs.hourly.precipitationProbability[i] ?? 0) >= inputs.thresholds.rain,
  )

  if (nextRainIdx >= 0) {
    notifications.push({
      id: 'notif-rain',
      type: 'rain',
      title: 'Rain risk in your routine window',
      body: 'Carry an umbrella and buffer extra commute time.',
      triggerAtIso: inputs.hourly.time[nextRainIdx] as string,
      priority: 'actionable',
    })
  }

  const uvIdx = findFirstIndex(
    inputs.hourly.time,
    (iso, i) =>
      iso.startsWith(todayDate) &&
      inputs.alertsEnabled.uv &&
      (inputs.hourly.uvIndex[i] ?? 0) >= inputs.thresholds.uv &&
      hourFromIso(iso) >= inputs.routine.morningStartHour,
  )

  if (uvIdx >= 0) {
    notifications.push({
      id: 'notif-uv',
      type: 'uv',
      title: 'UV alert for outdoor hours',
      body: 'High UV expected; sunscreen and shade are strongly recommended.',
      triggerAtIso: inputs.hourly.time[uvIdx] as string,
      priority: 'actionable',
    })
  }

  const windIdx = findFirstIndex(
    inputs.hourly.time,
    (iso, i) =>
      iso.startsWith(todayDate) &&
      inputs.alertsEnabled.wind &&
      (inputs.hourly.windGusts[i] ?? 0) >= inputs.thresholds.wind,
  )

  if (windIdx >= 0) {
    notifications.push({
      id: 'notif-wind',
      type: 'wind',
      title: 'High wind expected',
      body: 'Loose outdoor items may need securing before evening.',
      triggerAtIso: inputs.hourly.time[windIdx] as string,
      priority: 'helpful',
    })
  }

  if (inputs.alertsEnabled.pollen && inputs.airQuality) {
    const pollenSeries = inputs.airQuality.hourly.grassPollen
    const pollenIdx = findFirstIndex(
      inputs.airQuality.hourly.time,
      (iso, i) => iso.startsWith(todayDate) && (pollenSeries[i] ?? 0) >= 40,
    )
    if (pollenIdx >= 0) {
      notifications.push({
        id: 'notif-pollen',
        type: 'pollen',
        title: 'Pollen spike likely',
        body: 'Consider masks/medication before long outdoor exposure.',
        triggerAtIso: inputs.airQuality.hourly.time[pollenIdx] as string,
        priority: 'actionable',
      })
    }
  }

  if (inputs.alertsEnabled.severe) {
    const severeIdx = findFirstIndex(
      inputs.hourly.weatherCode,
      (code, i) => {
        const iso = inputs.hourly.time[i] ?? ''
        return iso.startsWith(todayDate) && (code === 95 || code === 96 || code === 99)
      },
    )
    if (severeIdx >= 0) {
      notifications.push({
        id: 'notif-severe',
        type: 'severe',
        title: 'Severe weather signal',
        body: 'Storm risk detected; avoid exposed outdoor activities.',
        triggerAtIso: inputs.hourly.time[severeIdx] as string,
        priority: 'critical',
      })
    }
  }

  if (tomorrowSummary) {
    const evening = new Date(now)
    evening.setHours(20, 0, 0, 0)
    notifications.push({
      id: 'notif-tomorrow',
      type: 'tomorrow',
      title: 'Tomorrow heads-up',
      body: tomorrowSummary.message,
      triggerAtIso: evening.toISOString(),
      priority: 'helpful',
    })
  }

  return notifications
}

export function buildPhase2Insights(inputs: BuildInputs): AIInsight[] {
  const health = inputs.airQuality?.current.usAqi ?? 0
  const uvMax = inputs.hourly.uvIndex.length > 0 ? Math.max(...inputs.hourly.uvIndex) : 0
  const headacheRisk = health > 90 || uvMax > 8 ? 'elevated' : 'stable'
  const commuteRain = Math.max(
    ...inputs.hourly.time
      .map((iso, i) => ({ h: hourFromIso(iso), rain: inputs.hourly.precipitationProbability[i] ?? 0 }))
      .filter((row) => row.h >= inputs.routine.commuteStartHour && row.h <= inputs.routine.commuteEndHour)
      .map((row) => row.rain),
    0,
  )
  const weekendCandidates = inputs.daily.time
    .map((day, idx) => ({ day, idx }))
    .filter(({ day }) => {
      const weekday = parseISO(day).getDay()
      return weekday === 0 || weekday === 6
    })
  const firstCandidate = weekendCandidates[0]
  const bestWeekendIdx =
    firstCandidate !== undefined
      ? weekendCandidates.reduce((best, candidate) => {
          const score =
            100 -
            (inputs.daily.precipitationProbabilityMax[candidate.idx] ?? 0) -
            (inputs.daily.windGustsMax[candidate.idx] ?? 0) * 0.8
          const bestScore =
            100 -
            (inputs.daily.precipitationProbabilityMax[best.idx] ?? 0) -
            (inputs.daily.windGustsMax[best.idx] ?? 0) * 0.8
          return score > bestScore ? candidate : best
        }, firstCandidate).idx
      : 0

  return [
    {
      id: 'p2-health-correlation',
      phase: 'phase2',
      kind: 'health',
      title: 'Health correlation assistant',
      message:
        headacheRisk === 'elevated'
          ? 'Headache and fatigue triggers look elevated; hydrate early and reduce peak-sun exertion.'
          : 'No major trigger pattern detected for headache/asthma-sensitive conditions today.',
      confidence: 0.64,
    },
    {
      id: 'p2-commute',
      phase: 'phase2',
      kind: 'commute',
      title: 'Commute disruption predictor',
      message:
        commuteRain >= 60
          ? 'Commute disruption risk is high. Plan 15-20 extra minutes.'
          : 'Commute weather risk is low-to-moderate.',
      confidence: 0.68,
    },
    {
      id: 'p2-weekend-plan',
      phase: 'phase2',
      kind: 'activity',
      title: 'Weekend plan optimizer',
      message: `Most favorable outdoor block starts on ${format(parseISO(inputs.daily.time[bestWeekendIdx] as string), 'EEE')}.`,
      confidence: 0.61,
    },
  ]
}

export function buildPhase3Insights(inputs: BuildInputs): AIInsight[] {
  const topDays = inputs.daily.time.map((day, idx) => {
    const score =
      100 -
      (inputs.daily.precipitationProbabilityMax[idx] ?? 0) * 0.8 -
      (inputs.daily.windGustsMax[idx] ?? 0) * 0.5 -
      (inputs.daily.uvIndexMax[idx] ?? 0) * 2
    return { day, score }
  })
  topDays.sort((a, b) => b.score - a.score)
  const strategy = topDays
    .slice(0, 3)
    .map((item, idx) => `${idx + 1}) ${format(parseISO(item.day), 'EEE')}`)
    .join(' ')

  return [
    {
      id: 'p3-coach',
      phase: 'phase3',
      kind: 'coach',
      title: 'Conversational weather coach',
      message: 'Ask: "Can I run after work?" for a personalized yes/no with best hour.',
      confidence: 0.57,
    },
    {
      id: 'p3-7day-strategy',
      phase: 'phase3',
      kind: 'strategy',
      title: '7-day AI strategy',
      message: `Top upcoming outdoor days: ${strategy}`,
      confidence: 0.62,
    },
    {
      id: 'p3-adaptive',
      phase: 'phase3',
      kind: 'notification',
      title: 'Adaptive alert learning',
      message: 'The app can weight future alerts based on useful vs dismissed feedback.',
      confidence: 0.59,
    },
  ]
}
