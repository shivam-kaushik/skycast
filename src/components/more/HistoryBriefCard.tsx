import React from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import GlassCard from '@/src/components/shared/GlassCard'
import SectionLabel from '@/src/components/shared/SectionLabel'
import type { HistoryBriefResult } from '@/src/utils/historyBrief'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, ACCENT, DANGER } from '@/src/theme/colors'

interface HistoryBriefCardProps {
  isLoading: boolean
  errorMessage: string | null
  brief: HistoryBriefResult | null
}

export default function HistoryBriefCard({ isLoading, errorMessage, brief }: HistoryBriefCardProps) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <SectionLabel text="Recent history (ERA5)" />
      </View>
      <GlassCard style={styles.card}>
        {isLoading && (
          <View style={styles.centerRow}>
            <ActivityIndicator size="small" color={ACCENT} />
            <Text style={styles.muted}>Loading reanalysis…</Text>
          </View>
        )}
        {!isLoading && errorMessage !== null && (
          <View style={styles.centerRow}>
            <Ionicons name="cloud-offline-outline" size={20} color={DANGER} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}
        {!isLoading && errorMessage === null && brief === null && (
          <Text style={styles.line}>History appears once your forecast is ready.</Text>
        )}
        {!isLoading && errorMessage === null && brief !== null && (
          <>
            <Text style={styles.range}>{brief.periodRange}</Text>
            {brief.lines.map((line, i) => (
              <View key={`${i}-${line.slice(0, 8)}`} style={styles.bulletRow}>
                <Text style={styles.bullet}>·</Text>
                <Text style={styles.line}>{line}</Text>
              </View>
            ))}
            <Text style={styles.footnote}>ERA5 from Open-Meteo — lags realtime by several days.</Text>
          </>
        )}
      </GlassCard>
    </View>
  )
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  card: {
    marginHorizontal: 16,
    padding: 16,
    gap: 8,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  muted: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 18,
  },
  range: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_TERTIARY,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 20,
    width: 10,
  },
  line: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: TEXT_SECONDARY,
  },
  footnote: {
    fontSize: 11,
    color: TEXT_TERTIARY,
    marginTop: 8,
    lineHeight: 16,
  },
})
