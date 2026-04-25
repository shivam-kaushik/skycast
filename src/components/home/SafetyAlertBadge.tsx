import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { WeatherAlert } from '@/src/types/weather'
import { DANGER, WARNING, TEXT_PRIMARY, TEXT_SECONDARY } from '@/src/theme/colors'

interface SafetyAlertBadgeProps {
  alerts: WeatherAlert[]
  onPress?: () => void
  onDismiss?: (id: string) => void
}

export default function SafetyAlertBadge({ alerts, onPress, onDismiss }: SafetyAlertBadgeProps) {
  if (alerts.length === 0) return null

  const top = alerts[0]!
  const isExtreme = top.severity === 'extreme'
  const color = isExtreme ? DANGER : WARNING
  const bgColor = isExtreme ? 'rgba(255,107,107,0.14)' : 'rgba(255,209,102,0.14)'
  const borderColor = isExtreme ? 'rgba(255,107,107,0.38)' : 'rgba(255,209,102,0.38)'

  return (
    <Pressable
      style={[styles.badge, { backgroundColor: bgColor, borderColor }]}
      onPress={onPress}
    >
      <Ionicons name="warning" size={16} color={color} style={styles.icon} />
      <View style={styles.textGroup}>
        <Text style={[styles.title, { color }]} numberOfLines={1}>{top.title}</Text>
        {alerts.length > 1 && (
          <Text style={styles.more}>+{alerts.length - 1} more alert{alerts.length > 2 ? 's' : ''}</Text>
        )}
      </View>
      {onDismiss && (
        <Pressable onPress={() => onDismiss(top.id)} hitSlop={8}>
          <Ionicons name="close" size={14} color={TEXT_SECONDARY} />
        </Pressable>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  icon: { flexShrink: 0 },
  textGroup: { flex: 1 },
  title: { fontSize: 13, fontWeight: '600' },
  more: { fontSize: 11, color: TEXT_PRIMARY, opacity: 0.6, marginTop: 2 },
})
