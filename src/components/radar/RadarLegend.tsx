import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { MapLayer } from '@/src/components/radar/mapLayerConfig'
import { TEXT_PRIMARY, TEXT_SECONDARY } from '@/src/theme/colors'
import { getRadarLegend } from '@/src/utils/radarLegend'

/** Match radar screen floaters (timeline / location bar) */
const LEGEND_SURFACE = 'rgba(26, 31, 47, 0.93)'
const LEGEND_BORDER = 'rgba(222, 225, 247, 0.16)'

interface RadarLegendProps {
  layer: MapLayer
}

export default function RadarLegend({ layer }: RadarLegendProps) {
  const legend = getRadarLegend(layer)

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{legend.title}</Text>
      <View style={styles.rows}>
        <View style={styles.gradientCol}>
          {legend.stops.map((stop) => (
            <View key={stop.label} style={[styles.stopBlock, { backgroundColor: stop.color }]} />
          ))}
        </View>
        <View style={styles.labelCol}>
          {legend.stops.map((stop) => (
            <Text key={stop.label} style={styles.label}>
              {stop.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: 120,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: LEGEND_SURFACE,
    borderWidth: 1.5,
    borderColor: LEGEND_BORDER,
  },
  title: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  rows: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  gradientCol: {
    width: 5,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'space-between',
    flex: 1,
    maxWidth: 5,
  },
  stopBlock: {
    flex: 1,
  },
  labelCol: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 92,
  },
  label: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '500',
  },
})
