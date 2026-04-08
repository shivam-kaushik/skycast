import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import GlassCard from '@/src/components/shared/GlassCard'
import { ACCENT, DANGER, SECONDARY, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY } from '@/src/theme/colors'
import type { AIInsight, SmartNotification } from '@/src/utils/aiInsights'

interface AIFeaturesCardProps {
  phase1: AIInsight[]
  phase2: AIInsight[]
  phase3: AIInsight[]
  notifications: SmartNotification[]
}

function priorityColor(priority: SmartNotification['priority']): string {
  if (priority === 'critical') return DANGER
  if (priority === 'actionable') return ACCENT
  return SECONDARY
}

export default function AIFeaturesCard({ phase1, phase2, phase3, notifications }: AIFeaturesCardProps) {
  return (
    <GlassCard style={styles.card}>
      <Text style={styles.title}>AI planner and alerts</Text>

      <Text style={styles.heading}>Phase 1 live now</Text>
      {phase1.map((insight) => (
        <View key={insight.id} style={styles.row}>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.copy}>{insight.title}: {insight.message}</Text>
        </View>
      ))}

      <Text style={styles.heading}>Smart notifications</Text>
      {notifications.length === 0 ? (
        <Text style={styles.empty}>No high-value triggers in the current forecast window.</Text>
      ) : (
        notifications.slice(0, 4).map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={[styles.dot, { color: priorityColor(item.priority) }]}>•</Text>
            <Text style={styles.copy}>
              {item.title} ({item.priority}) - {item.body}
            </Text>
          </View>
        ))
      )}

      <Text style={styles.heading}>Phase 2 next</Text>
      {phase2.map((insight) => (
        <View key={insight.id} style={styles.row}>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.copy}>{insight.title}: {insight.message}</Text>
        </View>
      ))}

      <Text style={styles.heading}>Phase 3 differentiators</Text>
      {phase3.map((insight) => (
        <View key={insight.id} style={styles.row}>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.copy}>{insight.title}: {insight.message}</Text>
        </View>
      ))}
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  heading: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: TEXT_TERTIARY,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  dot: {
    color: ACCENT,
    fontSize: 14,
    lineHeight: 20,
    width: 10,
  },
  copy: {
    flex: 1,
    color: TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 20,
  },
  empty: {
    color: TEXT_TERTIARY,
    fontSize: 12,
  },
})
