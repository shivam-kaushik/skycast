import React from 'react'
import { View, Pressable, Text, StyleSheet } from 'react-native'
import { usePersonaStore } from '@/src/store/personaStore'
import { TEXT_PRIMARY, TEXT_SECONDARY } from '@/src/theme/colors'
import { FONT_MEDIUM } from '@/src/theme/typography'

export default function PersonaSwitcher() {
  const { persona, setPersona } = usePersonaStore()

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => setPersona('athlete')}
        style={[styles.pill, persona === 'athlete' && styles.pillActive]}
      >
        <Text style={[styles.label, persona === 'athlete' && styles.labelActive]}>
          🏃 Athlete
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setPersona('wellness')}
        style={[styles.pill, persona === 'wellness' && styles.pillActive]}
      >
        <Text style={[styles.label, persona === 'wellness' && styles.labelActive]}>
          💊 Wellness
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(240,232,216,0.12)',
  },
  pillActive: {
    backgroundColor: 'rgba(245,166,35,0.12)',
    borderColor: 'rgba(245,166,35,0.35)',
  },
  label: { fontSize: 14, color: TEXT_SECONDARY, ...FONT_MEDIUM },
  labelActive: { color: TEXT_PRIMARY },
})
