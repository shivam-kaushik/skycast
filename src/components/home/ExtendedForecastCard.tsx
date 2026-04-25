import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { format, parseISO } from 'date-fns'
import { Ionicons } from '@expo/vector-icons'
import GlassCard from '@/src/components/shared/GlassCard'
import { formatTemp } from '@/src/utils/formatTemp'
import { getWeatherCodeInfo } from '@/src/utils/weatherCodes'
import type { DailyWeather } from '@/src/types/weather'
import { ACCENT, SECONDARY, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY } from '@/src/theme/colors'
import { FONT_BOLD } from '@/src/theme/typography'

interface ExtendedForecastCardProps {
  daily: DailyWeather
  unit: 'C' | 'F'
}

export default function ExtendedForecastCard({ daily, unit }: ExtendedForecastCardProps) {
  const extendedDays = daily.time.slice(7)

  if (extendedDays.length === 0) return null

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="calendar-outline" size={18} color={ACCENT} />
        <Text style={styles.title}>Extended Forecast</Text>
        <View style={styles.badge}>
          <Ionicons name="sparkles" size={11} color={ACCENT} />
          <Text style={styles.badgeText}>Premium</Text>
        </View>
      </View>

      {extendedDays.map((dateStr, i) => {
        const idx = i + 7
        const info = getWeatherCodeInfo(daily.weatherCode[idx] ?? 0)
        const precip = daily.precipitationProbabilityMax[idx] ?? 0
        return (
          <View key={dateStr} style={[styles.row, i < extendedDays.length - 1 && styles.rowBorder]}>
            <Text style={styles.dayLabel}>{format(parseISO(dateStr), 'EEE d MMM')}</Text>
            <Ionicons name={info.ionicon as never} size={18} color={TEXT_SECONDARY} style={styles.icon} />
            {precip >= 20 && (
              <Text style={styles.precip}>{precip}%</Text>
            )}
            <Text style={styles.temps}>
              <Text style={styles.tempHigh}>{formatTemp(daily.tempMax[idx] ?? 0, unit)}</Text>
              <Text style={styles.tempSep}> / </Text>
              <Text style={styles.tempLow}>{formatTemp(daily.tempMin[idx] ?? 0, unit)}</Text>
            </Text>
          </View>
        )
      })}
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    padding: 16,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    ...FONT_BOLD,
    fontSize: 15,
    color: TEXT_PRIMARY,
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(74,158,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    color: ACCENT,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  dayLabel: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    width: 100,
  },
  icon: {
    flex: 1,
  },
  precip: {
    fontSize: 12,
    color: SECONDARY,
    width: 36,
    textAlign: 'right',
  },
  temps: {
    fontSize: 14,
    width: 90,
    textAlign: 'right',
  },
  tempHigh: {
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  tempSep: {
    color: TEXT_TERTIARY,
  },
  tempLow: {
    color: TEXT_TERTIARY,
  },
})
