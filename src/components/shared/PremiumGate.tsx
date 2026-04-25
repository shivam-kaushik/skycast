import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { usePremiumStore } from '@/src/store/premiumStore'
import { ACCENT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY } from '@/src/theme/colors'
import { FONT_BOLD } from '@/src/theme/typography'

interface PremiumGateProps {
  featureName: string
  children: React.ReactNode
}

export default function PremiumGate({ featureName, children }: PremiumGateProps) {
  const { isPremium, showPaywall } = usePremiumStore()

  if (isPremium) return <>{children}</>

  return (
    <Pressable style={styles.gate} onPress={showPaywall}>
      <View style={styles.lockRow}>
        <View style={styles.lockIcon}>
          <Ionicons name="lock-closed" size={18} color={ACCENT} />
        </View>
        <View>
          <Text style={styles.featureName}>{featureName}</Text>
          <Text style={styles.unlockCta}>Unlock with Premium →</Text>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  gate: {
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: 'rgba(74,158,255,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.22)',
    padding: 18,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  lockIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74,158,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureName: {
    ...FONT_BOLD,
    fontSize: 15,
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  unlockCta: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
})
