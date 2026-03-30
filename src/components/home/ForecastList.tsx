import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import GlassCard from '@/src/components/shared/GlassCard'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, ACCENT } from '@/src/theme/colors'
import { getWeatherCodeInfo } from '@/src/utils/weatherCodes'
import { formatTemp } from '@/src/utils/formatTemp'
import type { DailyWeather } from '@/src/types/weather'

type IoniconName = ComponentProps<typeof Ionicons>['name']

interface ForecastListProps {
  daily: DailyWeather
  unit: 'C' | 'F'
  days?: number
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getDayLabel(dateStr: string, index: number): string {
  if (index === 0) return 'Today'
  if (index === 1) return 'Tomorrow'
  // Parse date without timezone issues
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year ?? 2024, (month ?? 1) - 1, day ?? 1)
  return DAY_NAMES[d.getDay()] ?? dateStr.slice(5)
}

export default function ForecastList({ daily, unit, days = 7 }: ForecastListProps) {
  const displayDays = daily.time.slice(0, days)

  return (
    <GlassCard style={styles.card}>
      {displayDays.map((date, i) => {
        const code = daily.weatherCode[i] ?? 0
        const { ionicon } = getWeatherCodeInfo(code)
        const maxTemp = daily.tempMax[i] ?? 0
        const minTemp = daily.tempMin[i] ?? 0
        const precipProb = daily.precipitationProbabilityMax[i] ?? 0
        const isLast = i === displayDays.length - 1

        return (
          <View key={date} style={[styles.row, !isLast && styles.rowBorder]}>
            <Text style={styles.dayLabel}>{getDayLabel(date, i)}</Text>
            <View style={styles.conditionCell}>
              <Ionicons name={ionicon as IoniconName} size={18} color={TEXT_SECONDARY} />
              {precipProb > 20 && (
                <Text style={styles.precipText}>{precipProb}%</Text>
              )}
            </View>
            <View style={styles.tempCell}>
              <Text style={styles.maxTemp}>{formatTemp(maxTemp, unit)}</Text>
              <Text style={styles.minTemp}>{formatTemp(minTemp, unit)}</Text>
            </View>
          </View>
        )
      })}
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  rowBorder: {
    borderBottomColor: 'rgba(255,255,255,0.06)',
    borderBottomWidth: 1,
  },
  dayLabel: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: '500',
    width: 90,
  },
  conditionCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  precipText: {
    fontSize: 12,
    color: ACCENT,
  },
  tempCell: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  maxTemp: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: '500',
    width: 46,
    textAlign: 'right',
  },
  minTemp: {
    fontSize: 14,
    color: TEXT_TERTIARY,
    width: 46,
    textAlign: 'right',
  },
})
