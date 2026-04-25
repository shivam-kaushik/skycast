import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { format } from 'date-fns'
import GlassCard from '@/src/components/shared/GlassCard'
import type { RainbowWindow } from '@/src/types/weather'
import { SECONDARY, TEXT_PRIMARY, TEXT_SECONDARY } from '@/src/theme/colors'

interface RainbowAlertProps {
  window: RainbowWindow | null
}

export default function RainbowAlert({ window }: RainbowAlertProps) {
  if (!window) return null

  const time = format(window.likelyAt, 'h:mm a')
  const direction = window.faceDirection

  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.emoji}>🌈</Text>
        <View style={styles.content}>
          <Text style={styles.title}>Rainbow likely around {time}</Text>
          <Text style={styles.sub}>Face {direction} — look opposite the sun</Text>
        </View>
      </View>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    padding: 14,
    borderColor: 'rgba(123,191,255,0.25)',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emoji: { fontSize: 28 },
  content: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: SECONDARY },
  sub: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 },
})
