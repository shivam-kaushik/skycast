import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { TEXT_TERTIARY } from '@/src/theme/colors'

interface SectionLabelProps {
  text: string
}

export default function SectionLabel({ text }: SectionLabelProps) {
  return <Text style={styles.label}>{text.toUpperCase()}</Text>
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: TEXT_TERTIARY,
  },
})
