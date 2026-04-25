import React from 'react'
import { ScrollView, View, Text, StyleSheet } from 'react-native'
import GlassCard from '@/src/components/shared/GlassCard'
import type { AirQualityData } from '@/src/types/weather'
import { describePollenLevel } from '@/src/utils/weatherDescriptions'
import { DANGER, GOOD, TEXT_SECONDARY, TEXT_TERTIARY, WARNING } from '@/src/theme/colors'
import { format, parseISO } from 'date-fns'

type AllergenKey = keyof Pick<
  AirQualityData['hourly'],
  'grassPollen' | 'birchPollen' | 'ragweedPollen' | 'alderPollen' | 'olivePollen' | 'mugwortPollen'
>

const ALLERGENS: { key: AllergenKey; label: string }[] = [
  { key: 'grassPollen', label: 'Grass' },
  { key: 'birchPollen', label: 'Birch' },
  { key: 'ragweedPollen', label: 'Ragweed' },
  { key: 'alderPollen', label: 'Alder' },
]

const LEVEL_COLOR: Record<string, string> = {
  None: 'rgba(6,214,160,0.25)',
  Low: GOOD,
  Moderate: WARNING,
  High: '#ff9f1c',
  'Very High': DANGER,
}

const LEVEL_HEIGHT: Record<string, number> = {
  None: 4,
  Low: 10,
  Moderate: 20,
  High: 30,
  'Very High': 40,
}

interface PollenTrendChartProps {
  hourly: AirQualityData['hourly']
  startIdx: number
  hoursToShow?: number
}

export default function PollenTrendChart({ hourly, startIdx, hoursToShow = 24 }: PollenTrendChartProps) {
  const visibleAllergens = ALLERGENS.filter(({ key }) => {
    const slice = hourly[key].slice(startIdx, startIdx + hoursToShow)
    return slice.some((v) => v !== null && (v as number) > 0)
  })

  if (visibleAllergens.length === 0) {
    return (
      <GlassCard style={styles.card}>
        <Text style={styles.sectionLabel}>POLLEN TREND</Text>
        <Text style={styles.empty}>No pollen activity in your area</Text>
      </GlassCard>
    )
  }

  const times = hourly.time.slice(startIdx, startIdx + hoursToShow)

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.sectionLabel}>POLLEN TREND (24H)</Text>
      {visibleAllergens.map(({ key, label }) => (
        <View key={key} style={styles.allergenRow}>
          <Text style={styles.allergenLabel}>{label}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
            <View style={styles.barsContainer}>
              {times.map((t, i) => {
                const val = hourly[key][startIdx + i] ?? null
                const level = describePollenLevel(val)
                const h = LEVEL_HEIGHT[level] ?? 4
                const color = LEVEL_COLOR[level] ?? GOOD
                const hour = t ? format(parseISO(t), 'ha').toLowerCase() : ''
                return (
                  <View key={i} style={styles.barCol}>
                    <View style={[styles.bar, { height: h, backgroundColor: color }]} />
                    {i % 6 === 0 && <Text style={styles.hourLabel}>{hour}</Text>}
                  </View>
                )
              })}
            </View>
          </ScrollView>
        </View>
      ))}
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, padding: 16 },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: TEXT_TERTIARY,
    marginBottom: 12,
  },
  empty: { fontSize: 13, color: TEXT_SECONDARY },
  allergenRow: { marginBottom: 12 },
  allergenLabel: { fontSize: 11, color: TEXT_SECONDARY, marginBottom: 6 },
  scroll: { flex: 1 },
  barsContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, minHeight: 50 },
  barCol: { alignItems: 'center', width: 12 },
  bar: { width: 8, borderRadius: 2 },
  hourLabel: { fontSize: 8, color: TEXT_TERTIARY, marginTop: 2 },
})
