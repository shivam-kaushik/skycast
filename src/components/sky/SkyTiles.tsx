import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { format } from 'date-fns'
import GlassCard from '@/src/components/shared/GlassCard'
import type { SkyPhenomena, LunarData } from '@/src/types/weather'
import { ACCENT, GOOD, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, WARNING } from '@/src/theme/colors'

interface SkyTilesProps {
  phenomena: SkyPhenomena
  lunar: LunarData
}

function scoreColor(score: number): string {
  if (score >= 7) return GOOD
  if (score >= 4) return WARNING
  return ACCENT
}

export default function SkyTiles({ phenomena, lunar }: SkyTilesProps) {
  const goldenHour = format(phenomena.goldenHourStart, 'h:mm a')
  const moonrise = lunar.rise ? format(lunar.rise, 'h:mm a') : '—'
  const nextNew = format(lunar.nextNewMoon, 'MMM d')

  const tiles = [
    {
      label: 'STARGAZING',
      value: `${phenomena.stargazingScore}/10`,
      sub: phenomena.stargazingScore >= 7 ? 'Great tonight' : phenomena.stargazingScore >= 4 ? 'Decent' : 'Poor',
      color: scoreColor(phenomena.stargazingScore),
    },
    {
      label: 'GOLDEN HOUR',
      value: goldenHour,
      sub: phenomena.goldenHourQuality,
      color: '#ffd98a',
    },
    {
      label: 'MOONRISE',
      value: moonrise,
      sub: `${Math.round(lunar.illumination * 100)}% full`,
      color: TEXT_SECONDARY,
    },
    {
      label: 'NEXT NEW MOON',
      value: nextNew,
      sub: 'Dark sky ahead',
      color: TEXT_SECONDARY,
    },
  ]

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <GlassCard key={tile.label} style={styles.tile}>
          <Text style={styles.tileLabel}>{tile.label}</Text>
          <Text style={[styles.tileValue, { color: tile.color }]}>{tile.value}</Text>
          <Text style={styles.tileSub}>{tile.sub}</Text>
        </GlassCard>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    gap: 10,
  },
  tile: {
    width: '46%',
    flexGrow: 1,
    padding: 14,
  },
  tileLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: TEXT_TERTIARY,
    marginBottom: 6,
  },
  tileValue: { fontSize: 20, fontWeight: '300' },
  tileSub: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 4 },
})
