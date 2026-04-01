import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import GlassCard from '@/src/components/shared/GlassCard'
import { describePollenLevel } from '@/src/utils/weatherDescriptions'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, GOOD, WARNING, DANGER } from '@/src/theme/colors'
import type { AirQualityData } from '@/src/types/weather'

interface PollenBarsProps {
  hourly: AirQualityData['hourly']
  currentHourIdx: number
}

interface PollenType {
  key: keyof Pick<
    AirQualityData['hourly'],
    | 'grassPollen'
    | 'birchPollen'
    | 'ragweedPollen'
    | 'alderPollen'
    | 'olivePollen'
    | 'mugwortPollen'
  >
  label: string
}

const POLLEN_TYPES: PollenType[] = [
  { key: 'grassPollen', label: 'Grass' },
  { key: 'birchPollen', label: 'Birch' },
  { key: 'ragweedPollen', label: 'Ragweed' },
  { key: 'alderPollen', label: 'Alder' },
  { key: 'olivePollen', label: 'Olive' },
  { key: 'mugwortPollen', label: 'Mugwort' },
]

const LEVEL_COLORS: Record<string, string> = {
  None: TEXT_TERTIARY,
  Low: GOOD,
  Moderate: WARNING,
  High: DANGER,
  'Very High': '#C0392B',
}

const BAR_FILL_NONE = 'rgba(255,255,255,0.12)'

const LEVEL_MAX = 100

function pollenAt(hourly: AirQualityData['hourly'], key: PollenType['key'], idx: number): number | null {
  const arr = hourly[key]
  const v = arr[idx]
  if (v === null || v === undefined) return null
  if (typeof v !== 'number' || Number.isNaN(v)) return null
  return v
}

export default function PollenBars({ hourly, currentHourIdx }: PollenBarsProps) {
  const safeIdx = Math.min(Math.max(currentHourIdx, 0), Math.max(hourly.time.length - 1, 0))

  const samples = POLLEN_TYPES.map(({ key }) => pollenAt(hourly, key, safeIdx))
  const allMissing = samples.every((s) => s === null)

  if (allMissing) {
    return (
      <GlassCard style={styles.card}>
        <Text style={styles.unavailableTitle}>No pollen data here</Text>
        <Text style={styles.unavailableBody}>
          Open-Meteo&apos;s pollen model mainly covers Europe. Other regions often return empty values —
          try a European city to verify the chart.
        </Text>
      </GlassCard>
    )
  }

  return (
    <GlassCard style={styles.card}>
      <View style={styles.list}>
        {POLLEN_TYPES.map(({ key, label }) => {
          const grains = pollenAt(hourly, key, safeIdx)
          if (grains === null) {
            return (
              <View key={label} style={styles.row}>
                <Text style={styles.pollenLabel}>{label}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barRow, styles.barUnavailable]} />
                </View>
                <Text style={[styles.levelText, styles.unavailableCell]}>—</Text>
              </View>
            )
          }

          const level = describePollenLevel(grains)
          const color = LEVEL_COLORS[level] ?? GOOD
          const barFlex = Math.min(Math.round(grains), LEVEL_MAX)
          const fillColor = level === 'None' ? BAR_FILL_NONE : color

          return (
            <View key={label} style={styles.row}>
              <Text style={styles.pollenLabel}>{label}</Text>
              <View style={styles.barTrack}>
                <View style={styles.barRow}>
                  <View style={{ flex: barFlex, backgroundColor: fillColor, borderRadius: 3 }} />
                  <View style={{ flex: Math.max(LEVEL_MAX - barFlex, 0) }} />
                </View>
              </View>
              <Text style={[styles.levelText, { color }]}>{level}</Text>
            </View>
          )
        })}
      </View>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginHorizontal: 16,
    gap: 12,
  },
  unavailableTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  unavailableBody: {
    fontSize: 13,
    lineHeight: 19,
    color: TEXT_SECONDARY,
    marginTop: 6,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pollenLabel: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    width: 70,
  },
  barTrack: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barRow: {
    flex: 1,
    flexDirection: 'row',
  },
  barUnavailable: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  levelText: {
    fontSize: 12,
    width: 72,
    textAlign: 'right',
  },
  unavailableCell: {
    color: TEXT_TERTIARY,
  },
})
