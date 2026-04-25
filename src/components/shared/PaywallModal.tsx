import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { usePremiumStore } from '@/src/store/premiumStore'
import { purchasePremium, restorePurchases } from '@/src/api/purchases'
import {
  BG,
  ACCENT,
  ON_PRIMARY,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  GOOD,
} from '@/src/theme/colors'
import { FONT_BOLD } from '@/src/theme/typography'

const FEATURES = [
  { icon: 'chatbubble-ellipses-outline', text: 'AI Chat Assistant — ask anything about your weather' },
  { icon: 'shirt-outline', text: 'AI Wardrobe Advisor — know exactly what to wear' },
  { icon: 'airplane-outline', text: 'Trip Weather Briefing — plan any journey intelligently' },
  { icon: 'analytics-outline', text: 'Priority refresh every 5 minutes' },
  { icon: 'calendar-outline', text: '21-day extended forecast' },
]

export default function PaywallModal() {
  const { isPaywallVisible, hidePaywall, setPremium, loadQueryCount } = usePremiumStore()
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubscribe() {
    setLoading(true)
    setError(null)
    try {
      const success = await purchasePremium()
      if (success) {
        setPremium(true)
        await loadQueryCount()
        hidePaywall()
      } else {
        setError('Purchase cancelled.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRestore() {
    setRestoring(true)
    setError(null)
    try {
      const success = await restorePurchases()
      if (success) {
        setPremium(true)
        await loadQueryCount()
        hidePaywall()
      } else {
        setError('No previous purchases found.')
      }
    } catch {
      setError('Restore failed. Please try again.')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <Modal
      visible={isPaywallVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={hidePaywall}
    >
      <View style={styles.root}>
        <LinearGradient
          colors={['rgba(74, 158, 255, 0.18)', 'transparent']}
          style={styles.glow}
          pointerEvents="none"
        />
        <Pressable style={styles.closeBtn} onPress={hidePaywall}>
          <Ionicons name="close" size={24} color={TEXT_SECONDARY} />
        </Pressable>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.iconRing}>
            <Ionicons name="sparkles" size={32} color={ACCENT} />
          </View>
          <Text style={styles.headline}>Skycast Premium</Text>
          <Text style={styles.subline}>AI-powered weather intelligence at your fingertips.</Text>

          <View style={styles.featureList}>
            {FEATURES.map((f) => (
              <View key={f.text} style={styles.featureRow}>
                <Ionicons name={f.icon as never} size={20} color={GOOD} />
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.pricingCard}>
            <Text style={styles.priceMain}>$2.99 / month</Text>
            <Text style={styles.priceSub}>or $19.99 / year · 7-day free trial</Text>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={[styles.ctaBtn, loading && styles.ctaBtnDisabled]}
            onPress={handleSubscribe}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={ON_PRIMARY} />
            ) : (
              <Text style={styles.ctaText}>Start Free Trial</Text>
            )}
          </Pressable>

          <Pressable onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
            <Text style={styles.restoreText}>
              {restoring ? 'Restoring…' : 'Restore Purchases'}
            </Text>
          </Pressable>

          <Text style={styles.legalText}>
            Payment charged to your App Store / Play Store account. Cancel anytime in your account settings.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 250,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: 20,
  },
  content: {
    paddingHorizontal: 28,
    paddingBottom: 48,
    alignItems: 'center',
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(74,158,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  headline: {
    ...FONT_BOLD,
    fontSize: 28,
    color: TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
  },
  subline: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  featureList: {
    alignSelf: 'stretch',
    gap: 16,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: TEXT_SECONDARY,
    lineHeight: 22,
  },
  pricingCard: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  priceMain: {
    ...FONT_BOLD,
    fontSize: 24,
    color: TEXT_PRIMARY,
  },
  priceSub: {
    fontSize: 13,
    color: TEXT_TERTIARY,
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#FF6B6B',
    marginBottom: 12,
    textAlign: 'center',
  },
  ctaBtn: {
    alignSelf: 'stretch',
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaBtnDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    ...FONT_BOLD,
    fontSize: 17,
    color: ON_PRIMARY,
  },
  restoreBtn: {
    paddingVertical: 8,
    marginBottom: 20,
  },
  restoreText: {
    fontSize: 14,
    color: TEXT_TERTIARY,
    textDecorationLine: 'underline',
  },
  legalText: {
    fontSize: 11,
    color: TEXT_TERTIARY,
    textAlign: 'center',
    lineHeight: 16,
  },
})
