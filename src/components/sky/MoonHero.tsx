import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { format } from 'date-fns'
import GlassCard from '@/src/components/shared/GlassCard'
import type { LunarData } from '@/src/types/weather'
import { ACCENT_SOFT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY } from '@/src/theme/colors'

const MOON_ICONS: Record<string, string> = {
  'New Moon': '🌑',
  'Waxing Crescent': '🌒',
  'First Quarter': '🌓',
  'Waxing Gibbous': '🌔',
  'Full Moon': '🌕',
  'Waning Gibbous': '🌖',
  'Last Quarter': '🌗',
  'Waning Crescent': '🌘',
}

interface MoonHeroProps {
  lunar: LunarData
}

export default function MoonHero({ lunar }: MoonHeroProps) {
  const icon = MOON_ICONS[lunar.phaseName] ?? '🌕'
  const illPct = Math.round(lunar.illumination * 100)
  const rise = lunar.rise ? format(lunar.rise, 'h:mm a') : '—'
  const set = lunar.set ? format(lunar.set, 'h:mm a') : '—'
  const nextFull = format(lunar.nextFullMoon, 'MMM d')
  const nextNew = format(lunar.nextNewMoon, 'MMM d')

  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.moonIcon}>{icon}</Text>
        <View style={styles.info}>
          <Text style={styles.phaseName}>{lunar.phaseName}</Text>
          <Text style={styles.illumination}>{illPct}% illuminated</Text>
        </View>
      </View>
      <View style={styles.timesRow}>
        <View style={styles.timeItem}>
          <Text style={styles.timeLabel}>RISES</Text>
          <Text style={styles.timeValue}>{rise}</Text>
        </View>
        <View style={styles.timeItem}>
          <Text style={styles.timeLabel}>SETS</Text>
          <Text style={styles.timeValue}>{set}</Text>
        </View>
        <View style={styles.timeItem}>
          <Text style={styles.timeLabel}>FULL MOON</Text>
          <Text style={styles.timeValue}>{nextFull}</Text>
        </View>
        <View style={styles.timeItem}>
          <Text style={styles.timeLabel}>NEW MOON</Text>
          <Text style={styles.timeValue}>{nextNew}</Text>
        </View>
      </View>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  moonIcon: { fontSize: 52 },
  info: { flex: 1 },
  phaseName: { fontSize: 22, fontWeight: '300', color: TEXT_PRIMARY },
  illumination: { fontSize: 14, color: ACCENT_SOFT, marginTop: 2 },
  timesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeItem: { alignItems: 'center' },
  timeLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: TEXT_TERTIARY,
    marginBottom: 3,
  },
  timeValue: { fontSize: 13, color: TEXT_SECONDARY },
})
