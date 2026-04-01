import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { ON_SURFACE_VARIANT } from '@/src/theme/colors'
import { FONT_BOLD } from '@/src/theme/typography'

interface SectionLabelProps {
  text: string
  /** When true, uses gold-tinted label like Stitch “Hourly Forecast” headers */
  accent?: boolean
}

export default function SectionLabel({ text, accent }: SectionLabelProps) {
  return (
    <Text style={[styles.label, accent && styles.labelAccent]}>{text.toUpperCase()}</Text>
  )
}

const styles = StyleSheet.create({
  label: {
    ...FONT_BOLD,
    fontSize: 11,
    letterSpacing: 1.2,
    color: ON_SURFACE_VARIANT,
  },
  labelAccent: {
    color: 'rgba(255, 193, 7, 0.65)',
  },
})
