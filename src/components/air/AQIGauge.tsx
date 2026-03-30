import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import GlassCard from '@/src/components/shared/GlassCard'
import { describeAQI } from '@/src/utils/weatherDescriptions'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY } from '@/src/theme/colors'

interface AQIGaugeProps {
  aqi: number
}

const AQI_SCALE = 300

export default function AQIGauge({ aqi }: AQIGaugeProps) {
  const { label, color, advice } = describeAQI(aqi)
  const clamped = Math.min(aqi, AQI_SCALE)

  return (
    <GlassCard style={styles.card}>
      <View style={styles.topRow}>
        <View style={[styles.circle, { borderColor: color }]}>
          <Text style={[styles.aqiNumber, { color }]}>{aqi}</Text>
          <Text style={styles.aqiUnit}>US AQI</Text>
        </View>
        <View style={styles.labelBlock}>
          <Text style={[styles.statusLabel, { color }]}>{label}</Text>
          <Text style={styles.advice}>{advice}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.barTrack}>
        <View style={styles.barRow}>
          <View style={{ flex: clamped, backgroundColor: color, borderRadius: 3 }} />
          <View style={{ flex: Math.max(AQI_SCALE - clamped, 0) }} />
        </View>
      </View>

      {/* Scale labels */}
      <View style={styles.scaleRow}>
        <Text style={styles.scaleLabel}>Good</Text>
        <Text style={styles.scaleLabel}>Moderate</Text>
        <Text style={styles.scaleLabel}>Unhealthy</Text>
        <Text style={styles.scaleLabel}>Hazardous</Text>
      </View>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginHorizontal: 16,
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aqiNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  aqiUnit: {
    fontSize: 10,
    color: TEXT_TERTIARY,
    fontWeight: '500',
  },
  labelBlock: {
    flex: 1,
    gap: 6,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  advice: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    lineHeight: 18,
  },
  barTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barRow: {
    flex: 1,
    flexDirection: 'row',
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    fontSize: 10,
    color: TEXT_TERTIARY,
  },
})
