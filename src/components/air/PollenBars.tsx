import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import GlassCard from '@/src/components/shared/GlassCard'
import SectionLabel from '@/src/components/shared/SectionLabel'
import { describePollenLevel } from '@/src/utils/weatherDescriptions'
import { TEXT_PRIMARY, TEXT_SECONDARY, GOOD, WARNING, DANGER } from '@/src/theme/colors'
import type { AirQualityData } from '@/src/types/weather'

interface PollenBarsProps {
  hourly: AirQualityData['hourly']
  currentHourIdx: number
}

interface PollenType {
  key: keyof AirQualityData['hourly']
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
  None: 'rgba(255,255,255,0.15)',
  Low: GOOD,
  Moderate: WARNING,
  High: DANGER,
  'Very High': '#C0392B',
}

const LEVEL_MAX = 100

export default function PollenBars({ hourly, currentHourIdx }: PollenBarsProps) {
  return (
    <GlassCard style={styles.card}>
      <SectionLabel text="Pollen" />
      <View style={styles.list}>
        {POLLEN_TYPES.map(({ key, label }) => {
          const rawVal = hourly[key] as number[]
          const value = rawVal[currentHourIdx] ?? 0
          const level = describePollenLevel(value)
          const color = LEVEL_COLORS[level] ?? GOOD
          const barFlex = Math.min(Math.round(value), LEVEL_MAX)

          return (
            <View key={label} style={styles.row}>
              <Text style={styles.pollenLabel}>{label}</Text>
              <View style={styles.barTrack}>
                <View style={styles.barRow}>
                  <View style={{ flex: barFlex, backgroundColor: color, borderRadius: 3 }} />
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
  levelText: {
    fontSize: 12,
    width: 60,
    textAlign: 'right',
  },
})
