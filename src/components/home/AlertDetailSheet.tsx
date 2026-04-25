import React from 'react'
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { WeatherAlert } from '@/src/types/weather'
import { DANGER, WARNING, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY } from '@/src/theme/colors'

interface AlertDetailSheetProps {
  alerts: WeatherAlert[]
  visible: boolean
  onClose: () => void
  onSeeMap: () => void
}

export default function AlertDetailSheet({ alerts, visible, onClose, onSeeMap }: AlertDetailSheetProps) {
  if (alerts.length === 0) return null

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>Active Alerts</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={20} color={TEXT_SECONDARY} />
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {alerts.map((alert) => {
            const isExtreme = alert.severity === 'extreme'
            const color = isExtreme ? DANGER : WARNING
            const bgColor = isExtreme ? 'rgba(255,107,107,0.10)' : 'rgba(255,209,102,0.10)'
            const borderColor = isExtreme ? 'rgba(255,107,107,0.28)' : 'rgba(255,209,102,0.28)'

            return (
              <View key={alert.id} style={[styles.alertCard, { backgroundColor: bgColor, borderColor }]}>
                <View style={styles.alertHeader}>
                  <Ionicons name="warning" size={16} color={color} />
                  <Text style={[styles.alertTitle, { color }]}>{alert.title}</Text>
                </View>
                {alert.description ? (
                  <Text style={styles.alertDesc}>{alert.description}</Text>
                ) : null}
                <View style={styles.alertMeta}>
                  <Text style={styles.metaText}>{alert.source}</Text>
                </View>
              </View>
            )
          })}
        </ScrollView>

        <Pressable style={styles.seeMapBtn} onPress={onSeeMap}>
          <Ionicons name="map" size={16} color={TEXT_PRIMARY} style={styles.mapIcon} />
          <Text style={styles.seeMapText}>See on Map</Text>
        </Pressable>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingBottom: 36,
    maxHeight: '70%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  scroll: {
    paddingHorizontal: 16,
  },
  alertCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  alertDesc: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 19,
  },
  alertMeta: {
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    color: TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  seeMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(74,158,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.35)',
    gap: 8,
  },
  mapIcon: {},
  seeMapText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
})
