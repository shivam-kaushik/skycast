import React from 'react'
import { View, Text, StyleSheet, type DimensionValue } from 'react-native'
import GlassCard from '@/src/components/shared/GlassCard'
import type { AllergyRiskData } from '@/src/types/weather'
import { DANGER, GOOD, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, WARNING } from '@/src/theme/colors'

const LABEL_COLORS: Record<string, string> = {
  Low: GOOD,
  Moderate: WARNING,
  High: '#ff9f1c',
  'Very High': DANGER,
}

const LABEL_WIDTHS: Record<string, DimensionValue> = {
  Low: '25%',
  Moderate: '50%',
  High: '75%',
  'Very High': '100%',
}

interface AllergyRiskIndexProps {
  risk: AllergyRiskData
  humidity: number
  windSpeed: number
}

export default function AllergyRiskIndex({ risk, humidity, windSpeed }: AllergyRiskIndexProps) {
  const color = LABEL_COLORS[risk.label] ?? WARNING
  const width = LABEL_WIDTHS[risk.label] ?? '50%'

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.sectionLabel}>ALLERGY RISK</Text>
      <View style={styles.headerRow}>
        <Text style={[styles.riskLabel, { color }]}>{risk.label}</Text>
        {risk.dominantAllergen && (
          <Text style={styles.allergen}>Dominant: {risk.dominantAllergen}</Text>
        )}
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width, backgroundColor: color }]} />
      </View>
      <View style={styles.footerRow}>
        <Text style={styles.meta}>Humidity {humidity}% · Wind {Math.round(windSpeed)} km/h</Text>
        <Text style={styles.score}>Score {risk.score.toFixed(1)}</Text>
      </View>
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
    marginBottom: 8,
  },
  headerRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  riskLabel: { fontSize: 22, fontWeight: '300' },
  allergen: { fontSize: 12, color: TEXT_SECONDARY },
  barBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, marginBottom: 8 },
  barFill: { height: 6, borderRadius: 3 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontSize: 11, color: TEXT_TERTIARY },
  score: { fontSize: 11, color: TEXT_TERTIARY },
})
