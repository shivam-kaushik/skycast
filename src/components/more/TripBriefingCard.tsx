import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getTripBriefing, buildWeatherContext, type WeatherContext } from '@/src/api/openai'
import { usePremiumStore } from '@/src/store/premiumStore'
import GlassCard from '@/src/components/shared/GlassCard'
import {
  ACCENT,
  ON_PRIMARY,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  BG,
} from '@/src/theme/colors'
import { FONT_BOLD } from '@/src/theme/typography'

interface TripBriefingCardProps {
  weatherCtx: WeatherContext
}

export default function TripBriefingCard({ weatherCtx }: TripBriefingCardProps) {
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [briefing, setBriefing] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { canQuery, incrementQuery, showPaywall } = usePremiumStore()

  async function generateBriefing() {
    if (!destination.trim() || !startDate.trim() || !endDate.trim()) return
    if (!canQuery()) {
      showPaywall()
      return
    }
    setLoading(true)
    setError(null)
    try {
      const ctx = buildWeatherContext(weatherCtx)
      await incrementQuery()
      const result = await getTripBriefing(destination.trim(), startDate.trim(), endDate.trim(), ctx)
      setBriefing(result)
    } catch {
      setError('Could not generate briefing. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const canGenerate = destination.trim().length > 0 && startDate.trim().length > 0 && endDate.trim().length > 0 && !loading

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="airplane-outline" size={18} color={ACCENT} />
        <Text style={styles.title}>Trip Weather Briefing</Text>
      </View>

      {!briefing ? (
        <View style={styles.form}>
          <TextInput
            style={styles.textInput}
            value={destination}
            onChangeText={setDestination}
            placeholder="Destination (e.g. Tokyo, Japan)"
            placeholderTextColor={TEXT_TERTIARY}
          />
          <View style={styles.dateRow}>
            <TextInput
              style={[styles.textInput, styles.dateInput]}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="Start (YYYY-MM-DD)"
              placeholderTextColor={TEXT_TERTIARY}
            />
            <TextInput
              style={[styles.textInput, styles.dateInput]}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="End (YYYY-MM-DD)"
              placeholderTextColor={TEXT_TERTIARY}
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={[styles.generateBtn, !canGenerate && styles.generateBtnDisabled]}
            onPress={generateBriefing}
            disabled={!canGenerate}
          >
            {loading ? (
              <ActivityIndicator color={ON_PRIMARY} />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color={ON_PRIMARY} />
                <Text style={styles.generateBtnText}>Generate Briefing</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={styles.briefingWrap}>
          <View style={styles.destRow}>
            <Ionicons name="location-outline" size={14} color={ACCENT} />
            <Text style={styles.destLabel}>{destination} · {startDate} – {endDate}</Text>
          </View>
          <Text style={styles.briefingText}>{briefing}</Text>
          <Pressable onPress={() => setBriefing(null)} style={styles.newTripBtn}>
            <Ionicons name="add-circle-outline" size={14} color={TEXT_TERTIARY} />
            <Text style={styles.newTripText}>Plan another trip</Text>
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
  form: {
    gap: 10,
  },
  textInput: {
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateInput: {
    flex: 1,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 12,
  },
  generateBtnDisabled: {
    opacity: 0.45,
  },
  generateBtnText: {
    ...FONT_BOLD,
    fontSize: 14,
    color: ON_PRIMARY,
  },
  errorText: {
    fontSize: 13,
    color: '#FF6B6B',
  },
  briefingWrap: {
    gap: 10,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  destLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  briefingText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    lineHeight: 22,
  },
  newTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingTop: 4,
  },
  newTripText: {
    fontSize: 12,
    color: TEXT_TERTIARY,
  },
})
