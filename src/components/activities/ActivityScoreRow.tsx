import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY } from '@/src/theme/colors'
import type { ActivityScore } from '@/src/types/weather'

type IoniconName = ComponentProps<typeof Ionicons>['name']

interface ActivityScoreRowProps {
  name: string
  icon: IoniconName
  score: ActivityScore
}

const SCORE_MAX = 10

export default function ActivityScoreRow({ name, icon, score }: ActivityScoreRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={score.color} />
      </View>
      <View style={styles.content}>
        <View style={styles.topLine}>
          <Text style={styles.name}>{name}</Text>
          <Text style={[styles.label, { color: score.color }]}>{score.label}</Text>
          <Text style={[styles.scoreNum, { color: score.color }]}>{score.score}</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={styles.barRow}>
            <View style={{ flex: score.score, backgroundColor: score.color, borderRadius: 2 }} />
            <View style={{ flex: Math.max(SCORE_MAX - score.score, 0) }} />
          </View>
        </View>
        <Text style={styles.reason} numberOfLines={1}>
          {score.reason}
          {score.bestWindow != null ? `  ·  ${score.bestWindow}` : ''}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    borderBottomWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: '600',
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  scoreNum: {
    fontSize: 16,
    fontWeight: '700',
    width: 24,
    textAlign: 'right',
  },
  barTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barRow: {
    flex: 1,
    flexDirection: 'row',
  },
  reason: {
    fontSize: 11,
    color: TEXT_SECONDARY,
  },
})
