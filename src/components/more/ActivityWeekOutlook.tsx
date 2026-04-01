import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import GlassCard from '@/src/components/shared/GlassCard'
import type { DayActivityOutlook } from '@/src/utils/activityWeekOutlook'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY } from '@/src/theme/colors'

interface ActivityWeekOutlookProps {
  days: DayActivityOutlook[]
}

export default function ActivityWeekOutlook({ days }: ActivityWeekOutlookProps) {
  return (
    <GlassCard style={styles.card}>
      {days.map((d, i) => {
        const [first, second] = d.topActivities
        const isLast = i === days.length - 1
        return (
          <View key={d.date} style={[styles.row, !isLast && styles.rowBorder]}>
            <View style={styles.dayCol}>
              <Text style={styles.dayLabel}>{d.dayLabel}</Text>
              <Text style={styles.dateTiny}>{d.date}</Text>
            </View>
            <View style={styles.mainCol}>
              <Text style={styles.activityLine} numberOfLines={1}>
                {first !== undefined ? `${first.name} (${first.score.label})` : '—'}
              </Text>
              {second !== undefined && (
                <Text style={styles.activitySub} numberOfLines={1}>
                  {second.name} · {second.score.label}
                </Text>
              )}
            </View>
            <Text style={[styles.scoreBadge, first !== undefined && { color: first.score.color }]}>
              {first !== undefined ? first.score.score : '—'}
            </Text>
          </View>
        )
      })}
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  dayCol: {
    width: 88,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  dateTiny: {
    fontSize: 10,
    color: TEXT_TERTIARY,
    marginTop: 2,
  },
  mainCol: {
    flex: 1,
    gap: 2,
  },
  activityLine: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: '600',
  },
  activitySub: {
    fontSize: 11,
    color: TEXT_TERTIARY,
  },
  scoreBadge: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_TERTIARY,
    width: 28,
    textAlign: 'right',
  },
})
