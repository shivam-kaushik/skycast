import React from 'react'
import { View, Pressable, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { usePersonaStore } from '@/src/store/personaStore'
import { ACCENT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, GOOD } from '@/src/theme/colors'
import { FONT_MEDIUM, FONT_SEMIBOLD } from '@/src/theme/typography'

const OPTIONS = [
  {
    key: 'athlete' as const,
    label: 'Athlete',
    icon: 'fitness-outline' as const,
    desc: 'Running, training & outdoor performance',
    activeColor: ACCENT,
  },
  {
    key: 'wellness' as const,
    label: 'Wellness',
    icon: 'heart-outline' as const,
    desc: 'Health, comfort & allergy sensitivity',
    activeColor: GOOD,
  },
]

export default function PersonaSwitcher() {
  const { persona, setPersona } = usePersonaStore()

  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const active = persona === opt.key
        return (
          <Pressable
            key={opt.key}
            testID={`persona-${opt.key}`}
            onPress={() => setPersona(opt.key)}
            style={[
              styles.option,
              active && { borderColor: opt.activeColor + '55', backgroundColor: opt.activeColor + '14' },
            ]}
          >
            <View style={[styles.iconRow, active && { opacity: 1 }]}>
              <Ionicons
                name={opt.icon}
                size={18}
                color={active ? opt.activeColor : TEXT_TERTIARY}
              />
              {active && (
                <View style={[styles.activeDot, { backgroundColor: opt.activeColor }]} />
              )}
            </View>
            <Text style={[styles.label, active && { color: TEXT_PRIMARY }]}>{opt.label}</Text>
            <Text style={styles.desc} numberOfLines={2}>{opt.desc}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  option: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(240,232,216,0.10)',
    gap: 4,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    opacity: 0.5,
    marginBottom: 2,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    ...FONT_SEMIBOLD,
  },
  desc: {
    fontSize: 11,
    color: TEXT_TERTIARY,
    ...FONT_MEDIUM,
    lineHeight: 15,
  },
})
