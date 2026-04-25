import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { format } from 'date-fns'
import GlassCard from '@/src/components/shared/GlassCard'
import { ACCENT, DANGER, GOOD, TEXT_SECONDARY, TEXT_TERTIARY, WARNING } from '@/src/theme/colors'

const SUNSET_COLORS = [DANGER, WARNING, WARNING, ACCENT, ACCENT, GOOD, GOOD, '#FFD166', '#FF9F1C', GOOD, GOOD]

interface SunsetBarProps {
  score: number
  sunsetTime: Date | null
}

function scoreLabel(score: number): string {
  if (score >= 8) return 'Spectacular'
  if (score >= 6) return 'Beautiful'
  if (score >= 4) return 'Pleasant'
  if (score >= 2) return 'Muted'
  return 'Overcast'
}

export default function SunsetBar({ score, sunsetTime }: SunsetBarProps) {
  const filled = Math.round(Math.min(10, Math.max(0, score)))
  const timeStr = sunsetTime ? format(sunsetTime, 'h:mm a') : '—'

  return (
    <GlassCard style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>SUNSET QUALITY</Text>
        <Text style={styles.time}>🌅 {timeStr}</Text>
      </View>
      <View style={styles.barRow}>
        {Array.from({ length: 10 }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i < filled ? SUNSET_COLORS[i] ?? ACCENT : 'rgba(255,255,255,0.1)',
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.scoreLabel}>{scoreLabel(score)} · {filled}/10</Text>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: TEXT_TERTIARY,
  },
  time: { fontSize: 12, color: TEXT_SECONDARY },
  barRow: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  dot: { flex: 1, height: 8, borderRadius: 4 },
  scoreLabel: { fontSize: 13, color: TEXT_SECONDARY },
})
