import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle, G } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import { describeAQI } from '@/src/utils/weatherDescriptions'
import {
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  ACCENT,
  SECONDARY,
  SURFACE_CONTAINER_HIGHEST,
} from '@/src/theme/colors'
import { FONT_BOLD, FONT_EXTRABOLD, FONT_SEMIBOLD } from '@/src/theme/typography'

interface AQIGaugeProps {
  aqi: number
}

const SIZE = 220
const STROKE = 12
const R = (SIZE - STROKE) / 2
const CX = SIZE / 2
const CY = SIZE / 2
const CIRC = 2 * Math.PI * R

export default function AQIGauge({ aqi }: AQIGaugeProps) {
  const { label, color, advice } = describeAQI(aqi)
  const progress = Math.min(Math.max(aqi / 300, 0), 1)
  const dashOffset = CIRC * (1 - progress)

  return (
    <View style={styles.hero}>
      <View style={styles.copy}>
        <Text style={styles.kicker}>Current Atmosphere</Text>
        <View style={styles.titleRow}>
          <Text style={styles.aqiHuge}>{aqi}</Text>
          <Text style={styles.aqiUnit}>US AQI</Text>
        </View>
        <Text style={[styles.quality, { color: SECONDARY }]}>{label} Quality</Text>
        <Text style={styles.advice}>{advice}</Text>
      </View>

      <View style={styles.ringWrap}>
        <Svg width={SIZE} height={SIZE} style={styles.svg}>
          <Circle
            cx={CX}
            cy={CY}
            r={R}
            stroke={SURFACE_CONTAINER_HIGHEST}
            strokeWidth={STROKE}
            fill="none"
            opacity={0.35}
          />
          <G transform={`rotate(-90 ${CX} ${CY})`}>
            <Circle
              cx={CX}
              cy={CY}
              r={R}
              stroke={color}
              strokeWidth={STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
            />
          </G>
        </Svg>
        <View style={styles.ringCenter} pointerEvents="none">
          <Ionicons name="leaf" size={36} color={ACCENT} />
          <Text style={styles.optimal}>{label === 'Good' ? 'OPTIMAL' : label.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 16,
  },
  copy: {
    flex: 1,
    minWidth: 200,
    gap: 8,
  },
  kicker: {
    ...FONT_BOLD,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: ACCENT,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  aqiHuge: {
    ...FONT_EXTRABOLD,
    fontSize: 72,
    color: TEXT_PRIMARY,
    letterSpacing: -3,
    lineHeight: 76,
  },
  aqiUnit: {
    ...FONT_BOLD,
    fontSize: 28,
    color: ACCENT,
    marginTop: 8,
  },
  quality: {
    ...FONT_SEMIBOLD,
    fontSize: 22,
  },
  advice: {
    fontSize: 15,
    lineHeight: 22,
    color: TEXT_SECONDARY,
    maxWidth: 340,
  },
  ringWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  optimal: {
    ...FONT_BOLD,
    fontSize: 11,
    letterSpacing: 1,
    color: ACCENT,
  },
})
