import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { format } from 'date-fns'
import { useRainBar } from '@/src/hooks/useRainBar'
import type { HourlyWeather } from '@/src/types/weather'
import { SECONDARY, TEXT_SECONDARY } from '@/src/theme/colors'
import { FONT_REGULAR } from '@/src/theme/typography'
import SectionLabel from '@/src/components/shared/SectionLabel'

function segmentColor(prob: number): string {
  if (prob < 25) return 'rgba(123,191,255,0.12)'
  if (prob < 50) return 'rgba(123,191,255,0.35)'
  if (prob < 75) return 'rgba(123,191,255,0.65)'
  return SECONDARY
}

interface Props {
  hourly: HourlyWeather
}

export default function RainProbabilityBar({ hourly }: Props) {
  const { segments, peakProbability, peakTime } = useRainBar(hourly)

  if (peakProbability < 10) return null

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SectionLabel text="Next 3 Hours" />
        <Text style={styles.peak}>
          {`Peak ${Math.round(peakProbability)}%${peakTime ? ` · ${format(peakTime, 'h:mm a')}` : ''}`}
        </Text>
      </View>
      <View style={styles.bar}>
        {segments.map((seg, i) => (
          <View key={i} style={[styles.segment, { backgroundColor: segmentColor(seg.probability) }]} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  peak: { fontSize: 12, color: TEXT_SECONDARY, ...FONT_REGULAR },
  bar: { flexDirection: 'row', height: 28, borderRadius: 8, overflow: 'hidden', gap: 1 },
  segment: { flex: 1 },
})
