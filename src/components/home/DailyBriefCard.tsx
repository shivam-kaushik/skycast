import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import GlassCard from '@/src/components/shared/GlassCard'
import { TEXT_SECONDARY, ACCENT } from '@/src/theme/colors'
import { FONT_BOLD } from '@/src/theme/typography'
import { generateDailyBrief } from '@/src/utils/dailyBrief'
import type { CurrentWeather, HourlyWeather } from '@/src/types/weather'

interface DailyBriefCardProps {
  current: CurrentWeather
  hourly: HourlyWeather
}

export default function DailyBriefCard({ current, hourly }: DailyBriefCardProps) {
  const brief = generateDailyBrief(current, hourly)

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="star" size={18} color={ACCENT} />
        <Text style={styles.headerLabel}>Daily Brief</Text>
      </View>
      <Text style={styles.text}>{brief}</Text>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  headerLabel: {
    ...FONT_BOLD,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: ACCENT,
  },
  text: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    lineHeight: 24,
  },
})
