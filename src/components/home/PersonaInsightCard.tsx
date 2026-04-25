import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import GlassCard from '@/src/components/shared/GlassCard'
import { usePersonaStore } from '@/src/store/personaStore'
import { scoreActivity } from '@/src/utils/activityScores'
import { buildHealthInsights, maxPollenLevelAtHour } from '@/src/utils/healthInsights'
import type { HourlyWeather, DailyWeather, AirQualityData } from '@/src/types/weather'
import { ACCENT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, WARNING } from '@/src/theme/colors'

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
  hourly,
  daily,
  airHourly,
  today,
  currentHourIdx,
  humidity,
  windSpeed,
  uvIndex,
  usAqi,
}: Props) {
  const { persona } = usePersonaStore()

  if (persona === 'athlete') {
    const running = scoreActivity('running', hourly, daily, today)
    const cycling = scoreActivity('cycling', hourly, daily, today)
    const topActivity = running.score >= cycling.score ? running : cycling
    const activityName = running.score >= cycling.score ? 'Running' : 'Cycling'

    return (
      <GlassCard style={styles.card}>
        <Text style={styles.label}>Activity Window</Text>
        <Text style={styles.activityName}>{activityName}</Text>
        <Text style={styles.score}>{topActivity.score}/10 · {topActivity.label}</Text>
        <Text style={styles.reason}>{topActivity.reason}</Text>
        {topActivity.bestWindow ? (
          <Text style={styles.bestWindow}>{topActivity.bestWindow}</Text>
        ) : null}
      </GlassCard>
    )
  }

  const pollenSummary = maxPollenLevelAtHour(airHourly, currentHourIdx)
  const currentForHealth = {
    temperature: hourly.temperature[currentHourIdx] ?? 20,
    apparentTemperature: hourly.apparentTemperature[currentHourIdx] ?? 19,
    humidity,
    precipitationProbability: hourly.precipitationProbability[currentHourIdx] ?? 0,
    weatherCode: hourly.weatherCode[currentHourIdx] ?? 0,
    windSpeed,
    windDirection: 0,
    windGusts: hourly.windGusts[currentHourIdx] ?? 0,
    pressure: (hourly.surfacePressure?.[currentHourIdx]) ?? 1013,
    visibility: hourly.visibility[currentHourIdx] ?? 15,
    uvIndex,
    cloudCover: hourly.cloudCover[currentHourIdx] ?? 0,
  }
  const airCurrent = {
    pm10: 5, pm25: 3, co: 200, no2: 10, ozone: 40, so2: 2,
    usAqi,
    europeanAqi: usAqi,
  }

  const insights = buildHealthInsights(currentForHealth, airCurrent, pollenSummary)

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.label}>Health Alert</Text>
      {insights.slice(0, 3).map((line, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.bullet}>·</Text>
          <Text style={styles.insightLine}>{line}</Text>
        </View>
      ))}
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, padding: 16 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: TEXT_TERTIARY,
    marginBottom: 8,
  },
  activityName: { fontSize: 20, fontWeight: '600', color: TEXT_PRIMARY },
  score: { fontSize: 14, color: ACCENT, marginTop: 2 },
  reason: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 4 },
  bestWindow: { fontSize: 12, color: WARNING, marginTop: 6 },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  bullet: { fontSize: 14, color: TEXT_SECONDARY },
  insightLine: { flex: 1, fontSize: 13, color: TEXT_SECONDARY },
})
