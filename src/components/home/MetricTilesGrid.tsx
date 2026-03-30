import React from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import GlassCard from '@/src/components/shared/GlassCard'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY } from '@/src/theme/colors'
import {
  describeHumidity,
  describeWind,
  describeUV,
  describeVisibility,
} from '@/src/utils/weatherDescriptions'
import type { CurrentWeather } from '@/src/types/weather'

type IoniconName = ComponentProps<typeof Ionicons>['name']

interface MetricTilesGridProps {
  current: CurrentWeather
}

interface TileData {
  icon: IoniconName
  label: string
  value: string
  description: string
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const TILE_WIDTH = (SCREEN_WIDTH - 32 - 10) / 2

function cloudCoverDescription(pct: number): string {
  if (pct < 25) return 'Mostly clear'
  if (pct < 50) return 'Partly cloudy'
  if (pct < 85) return 'Mostly cloudy'
  return 'Overcast'
}

export default function MetricTilesGrid({ current }: MetricTilesGridProps) {
  const tiles: TileData[] = [
    {
      icon: 'water-outline',
      label: 'HUMIDITY',
      value: `${current.humidity}%`,
      description: describeHumidity(current.humidity),
    },
    {
      icon: 'speedometer-outline',
      label: 'WIND',
      value: `${Math.round(current.windSpeed)} km/h`,
      description: describeWind(current.windSpeed),
    },
    {
      icon: 'sunny-outline',
      label: 'UV INDEX',
      value: String(Math.round(current.uvIndex)),
      description: describeUV(current.uvIndex),
    },
    {
      icon: 'thermometer-outline',
      label: 'FEELS LIKE',
      value: `${Math.round(current.apparentTemperature)}°`,
      description: `Actual ${Math.round(current.temperature)}°`,
    },
    {
      icon: 'eye-outline',
      label: 'VISIBILITY',
      value: `${current.visibility.toFixed(1)} km`,
      description: describeVisibility(current.visibility),
    },
    {
      icon: 'cloud-outline',
      label: 'CLOUD COVER',
      value: `${current.cloudCover}%`,
      description: cloudCoverDescription(current.cloudCover),
    },
  ]

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <GlassCard key={tile.label} style={[styles.tile, { width: TILE_WIDTH }]}>
          <Ionicons name={tile.icon} size={22} color={TEXT_SECONDARY} />
          <Text style={styles.tileLabel}>{tile.label}</Text>
          <Text style={styles.tileValue}>{tile.value}</Text>
          <Text style={styles.tileDesc} numberOfLines={2}>
            {tile.description}
          </Text>
        </GlassCard>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  tile: {
    padding: 14,
    borderRadius: 12,
    gap: 4,
  },
  tileLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    color: TEXT_TERTIARY,
    marginTop: 4,
  },
  tileValue: {
    fontSize: 20,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  tileDesc: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    lineHeight: 15,
  },
})
