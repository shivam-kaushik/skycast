import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { GLASS_BG, GHOST_BORDER } from '@/src/theme/colors'

interface GlassCardProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  onPress?: () => void
}

export default function GlassCard({ children, style, onPress }: GlassCardProps) {
  if (onPress) {
    return (
      <Pressable style={[styles.card, style]} onPress={onPress}>
        {children}
      </Pressable>
    )
  }

  return <View style={[styles.card, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: GLASS_BG,
    borderColor: GHOST_BORDER,
    borderRadius: 22,
    borderWidth: 1,
  },
})
