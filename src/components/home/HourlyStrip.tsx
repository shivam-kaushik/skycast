import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, ACCENT, GLASS_BG, GHOST_BORDER } from '@/src/theme/colors'
import { FONT_BOLD } from '@/src/theme/typography'
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {displayHours.map((time, i) => {
        const idx = startIdx + i
        const temp = hourly.temperature[idx] ?? 0
        const code = hourly.weatherCode[idx] ?? 0
        const { ionicon } = getWeatherCodeInfo(code)
        const isNow = i === 0

        return (
          <View
            key={time}
            style={[
              styles.chip,
              isNow && styles.chipActive,
            ]}
          >
            <Text style={[styles.hourLabel, isNow && styles.nowLabel]}>
              {isNow ? 'Now' : formatHour(time)}
            </Text>
            <Ionicons
              name={ionicon as IoniconName}
              size={28}
              color={isNow ? ACCENT : TEXT_PRIMARY}
            />
            <Text style={[styles.tempText, isNow && styles.nowTemp]}>
              {formatTemp(temp, unit)}
            </Text>
          </View>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  chip: {
    width: 96,
    minHeight: 152,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: GHOST_BORDER,
    backgroundColor: GLASS_BG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  chipActive: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderColor: 'rgba(255, 193, 7, 0.35)',
  },
  hourLabel: {
    ...FONT_BOLD,
    fontSize: 12,
    color: TEXT_TERTIARY,
  },
  nowLabel: {
    color: TEXT_PRIMARY,
  },
  tempText: {
    ...FONT_BOLD,
    fontSize: 17,
    color: TEXT_SECONDARY,
  },
  nowTemp: {
    color: TEXT_PRIMARY,
  },
})
