import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import GlassCard from '@/src/components/shared/GlassCard'
import { TEXT_SECONDARY } from '@/src/theme/colors'

interface HealthInsightsCardProps {
  lines: string[]
}

export default function HealthInsightsCard({ lines }: HealthInsightsCardProps) {
  return (
    <GlassCard style={styles.card}>
      {lines.map((line, i) => (
        <View key={`${i}-${line.slice(0, 12)}`} style={styles.bulletRow}>
          <Text style={styles.bullet}>·</Text>
          <Text style={styles.line}>{line}</Text>
        </View>
      ))}
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    padding: 16,
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 20,
    width: 10,
  },
  line: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: TEXT_SECONDARY,
  },
})
