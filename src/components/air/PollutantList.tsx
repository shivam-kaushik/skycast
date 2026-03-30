import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import GlassCard from '@/src/components/shared/GlassCard'
import SectionLabel from '@/src/components/shared/SectionLabel'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, GOOD, WARNING, DANGER } from '@/src/theme/colors'
import type { AirQualityData } from '@/src/types/weather'

interface PollutantListProps {
  current: AirQualityData['current']
}

interface Pollutant {
  key: keyof AirQualityData['current']
  label: string
  unit: string
  goodBelow: number
  badAbove: number
}

const POLLUTANTS: Pollutant[] = [
  { key: 'pm25', label: 'PM2.5', unit: 'μg/m³', goodBelow: 12, badAbove: 35 },
  { key: 'pm10', label: 'PM10', unit: 'μg/m³', goodBelow: 54, badAbove: 154 },
  { key: 'no2', label: 'NO₂', unit: 'μg/m³', goodBelow: 53, badAbove: 100 },
  { key: 'ozone', label: 'Ozone', unit: 'μg/m³', goodBelow: 54, badAbove: 70 },
  { key: 'co', label: 'CO', unit: 'mg/m³', goodBelow: 4400, badAbove: 9400 },
  { key: 'so2', label: 'SO₂', unit: 'μg/m³', goodBelow: 35, badAbove: 75 },
]

function getColor(value: number, goodBelow: number, badAbove: number): string {
  if (value <= goodBelow) return GOOD
  if (value >= badAbove) return DANGER
  return WARNING
}

function formatValue(value: number, key: string): string {
  if (key === 'co') return `${(value / 1000).toFixed(1)}`
  return value < 10 ? value.toFixed(1) : String(Math.round(value))
}

export default function PollutantList({ current }: PollutantListProps) {
  return (
    <GlassCard style={styles.card}>
      <SectionLabel text="Pollutants" />
      <View style={styles.list}>
        {POLLUTANTS.map(({ key, label, unit, goodBelow, badAbove }) => {
          const value = current[key] as number
          const color = getColor(value, goodBelow, badAbove)
          const displayVal = formatValue(value, key)

          return (
            <View key={label} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={styles.pollutantLabel}>{label}</Text>
              <Text style={styles.unit}>{unit}</Text>
              <Text style={[styles.value, { color }]}>{displayVal}</Text>
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
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pollutantLabel: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: '500',
    width: 60,
  },
  unit: {
    fontSize: 11,
    color: TEXT_TERTIARY,
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
})
