import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import GlassCard from '@/src/components/shared/GlassCard'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, ACCENT } from '@/src/theme/colors'
import { getWeatherCodeInfo } from '@/src/utils/weatherCodes'
import { formatTemp } from '@/src/utils/formatTemp'
import type { HourlyWeather } from '@/src/types/weather'

type IoniconName = ComponentProps<typeof Ionicons>['name']

interface HourlyStripProps {
  hourly: HourlyWeather
  unit: 'C' | 'F'
}

function formatHour(timeStr: string): string {
  const hour = parseInt(timeStr.slice(11, 13), 10)
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

export default function HourlyStrip({ hourly, unit }: HourlyStripProps) {
  const now = new Date()
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:`

  let startIdx = hourly.time.findIndex((t) => t >= nowStr)
  if (startIdx === -1) startIdx = 0

  const displayHours = hourly.time.slice(startIdx, startIdx + 24)

  return (
    <GlassCard style={styles.card}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {displayHours.map((time, i) => {
          const idx = startIdx + i
          const temp = hourly.temperature[idx] ?? 0
          const code = hourly.weatherCode[idx] ?? 0
          const precipProb = hourly.precipitationProbability[idx] ?? 0
          const { ionicon } = getWeatherCodeInfo(code)
          const isNow = i === 0

          return (
            <View key={time} style={styles.hourItem}>
              <Text style={[styles.hourLabel, isNow && styles.nowLabel]}>
                {isNow ? 'Now' : formatHour(time)}
              </Text>
              <Ionicons
                name={ionicon as IoniconName}
                size={20}
                color={isNow ? ACCENT : TEXT_SECONDARY}
              />
              {precipProb > 20 ? (
                <Text style={styles.precipText}>{precipProb}%</Text>
              ) : (
                <View style={styles.precipPlaceholder} />
              )}
              <Text style={[styles.tempText, isNow && styles.nowTemp]}>
                {formatTemp(temp, unit)}
              </Text>
            </View>
          )
        })}
      </ScrollView>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    paddingVertical: 16,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 4,
  },
  hourItem: {
    alignItems: 'center',
    width: 58,
    gap: 6,
  },
  hourLabel: {
    fontSize: 12,
    color: TEXT_TERTIARY,
    fontWeight: '500',
  },
  nowLabel: {
    color: ACCENT,
    fontWeight: '700',
  },
  precipText: {
    fontSize: 10,
    color: ACCENT,
    height: 14,
  },
  precipPlaceholder: {
    height: 14,
  },
  tempText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  nowTemp: {
    color: TEXT_PRIMARY,
    fontWeight: '700',
  },
})
