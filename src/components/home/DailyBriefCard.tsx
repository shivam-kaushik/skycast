import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import GlassCard from '@/src/components/shared/GlassCard'
import { TEXT_SECONDARY, ACCENT } from '@/src/theme/colors'
import { generateDailyBrief } from '@/src/utils/dailyBrief'
import { getWeatherCodeInfo } from '@/src/utils/weatherCodes'
import type { CurrentWeather, HourlyWeather } from '@/src/types/weather'

type IoniconName = ComponentProps<typeof Ionicons>['name']

interface DailyBriefCardProps {
  current: CurrentWeather
  hourly: HourlyWeather
}

export default function DailyBriefCard({ current, hourly }: DailyBriefCardProps) {
  const brief = generateDailyBrief(current, hourly)
  const { ionicon } = getWeatherCodeInfo(current.weatherCode)

  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <Ionicons name={ionicon as IoniconName} size={26} color={ACCENT} style={styles.icon} />
        <Text style={styles.text}>{brief}</Text>
      </View>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  icon: {
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 22,
  },
})
