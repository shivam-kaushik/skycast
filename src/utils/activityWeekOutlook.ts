import type { ActivityScore, DailyWeather, HourlyWeather } from '@/src/types/weather'
import { getForecastDayLabel } from '@/src/utils/forecastDayLabel'
import {
  scoreRunning,
  scoreCycling,
  scoreHiking,
  scorePhotography,
  scoreOutdoorDining,
  scoreGardening,
  scoreBeach,
  scoreStargazing,
  scoreBBQ,
  scoreDogWalking,
} from '@/src/utils/activityScores'

interface ScorerEntry {
  name: string
  scoreFor: (
    h: HourlyWeather,
    d: DailyWeather,
    targetDate: string,
  ) => ActivityScore
}

const SCORERS: ScorerEntry[] = [
  { name: 'Running', scoreFor: scoreRunning },
  { name: 'Cycling', scoreFor: scoreCycling },
  { name: 'Hiking', scoreFor: scoreHiking },
  { name: 'Photography', scoreFor: scorePhotography },
  { name: 'Outdoor Dining', scoreFor: scoreOutdoorDining },
  { name: 'Gardening', scoreFor: scoreGardening },
  { name: 'Beach', scoreFor: scoreBeach },
  { name: 'Stargazing', scoreFor: scoreStargazing },
  { name: 'BBQ', scoreFor: scoreBBQ },
  { name: 'Dog Walking', scoreFor: scoreDogWalking },
]

export interface DayActivityOutlook {
  date: string
  dayLabel: string
  topActivities: { name: string; score: ActivityScore }[]
}

const TOP_N = 2
const DAY_COUNT = 7

export function buildSevenDayActivityOutlook(
  hourly: HourlyWeather,
  daily: DailyWeather,
): DayActivityOutlook[] {
  const slice = daily.time.slice(0, DAY_COUNT)
  return slice.map((dateStr, index) => {
    const ranked = SCORERS.map(({ name, scoreFor }) => ({
      name,
      score: scoreFor(hourly, daily, dateStr),
    })).sort((a, b) => b.score.score - a.score.score)

    return {
      date: dateStr,
      dayLabel: getForecastDayLabel(dateStr, index),
      topActivities: ranked.slice(0, TOP_N),
    }
  })
}
