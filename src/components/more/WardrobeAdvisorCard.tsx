import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getWardrobeAdvice, buildWeatherContext, type WeatherContext, type WardrobeAdvice } from '@/src/api/openai'
import { usePremiumStore } from '@/src/store/premiumStore'
import GlassCard from '@/src/components/shared/GlassCard'
import {
  ACCENT,
  ON_PRIMARY,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
} from '@/src/theme/colors'
import { FONT_BOLD } from '@/src/theme/typography'

interface WardrobeAdvisorCardProps {
  weatherCtx: WeatherContext
}

const OUTFIT_ROWS: Array<{ key: keyof Pick<WardrobeAdvice, 'top' | 'bottom' | 'footwear'>; label: string; icon: string }> = [
  { key: 'top', label: 'Top', icon: 'shirt-outline' },
  { key: 'bottom', label: 'Bottom', icon: 'body-outline' },
  { key: 'footwear', label: 'Footwear', icon: 'footsteps-outline' },
]

export default function WardrobeAdvisorCard({ weatherCtx }: WardrobeAdvisorCardProps) {
  const [advice, setAdvice] = useState<WardrobeAdvice | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { canQuery, incrementQuery, showPaywall } = usePremiumStore()

  async function fetchAdvice() {
    if (!canQuery()) {
      showPaywall()
      return
    }
    setLoading(true)
    setError(null)
    try {
      const ctx = buildWeatherContext(weatherCtx)
      await incrementQuery()
      const result = await getWardrobeAdvice(ctx)
      setAdvice(result)
    } catch {
      setError('Could not get wardrobe advice. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="shirt-outline" size={18} color={ACCENT} />
        <Text style={styles.title}>Wardrobe Advisor</Text>
      </View>

      {!advice && !loading && (
        <Pressable style={styles.askBtn} onPress={fetchAdvice}>
          <Text style={styles.askBtnText}>What should I wear today?</Text>
          <Ionicons name="arrow-forward" size={16} color={ON_PRIMARY} />
        </Pressable>
      )}

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={ACCENT} />
          <Text style={styles.loadingText}>Checking the forecast…</Text>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {advice && (
        <View style={styles.adviceWrap}>
          {OUTFIT_ROWS.map((row) => (
            <View key={row.key} style={styles.outfitRow}>
              <Ionicons name={row.icon as never} size={16} color={TEXT_TERTIARY} />
              <View>
                <Text style={styles.outfitLabel}>{row.label}</Text>
                <Text style={styles.outfitValue}>{advice[row.key]}</Text>
              </View>
            </View>
          ))}

          {advice.accessories.length > 0 && (
            <View style={styles.outfitRow}>
              <Ionicons name="umbrella-outline" size={16} color={TEXT_TERTIARY} />
              <View>
                <Text style={styles.outfitLabel}>Accessories</Text>
                <Text style={styles.outfitValue}>{advice.accessories.join(', ')}</Text>
              </View>
            </View>
          )}

          {advice.notes.length > 0 && (
            <Text style={styles.notes}>{advice.notes}</Text>
          )}

          <Pressable onPress={() => { setAdvice(null); fetchAdvice() }} style={styles.refreshBtn}>
            <Ionicons name="refresh-outline" size={14} color={TEXT_TERTIARY} />
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>
      )}
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...FONT_BOLD,
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
  askBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  askBtnText: {
    ...FONT_BOLD,
    fontSize: 14,
    color: ON_PRIMARY,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  errorText: {
    fontSize: 13,
    color: '#FF6B6B',
  },
  adviceWrap: {
    gap: 10,
  },
  outfitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  outfitLabel: {
    fontSize: 10,
    color: TEXT_TERTIARY,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  outfitValue: {
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  notes: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 10,
    marginTop: 2,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  refreshText: {
    fontSize: 12,
    color: TEXT_TERTIARY,
  },
})
