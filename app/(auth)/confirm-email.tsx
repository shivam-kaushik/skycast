import React, { useEffect } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator, StatusBar } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthLink } from '@/src/hooks/useAuthLink'
import { useAuthStore } from '@/src/store/authStore'
import { syncPurchasesForUser } from '@/src/utils/postSignIn'
import { BG, ACCENT, TEXT_PRIMARY, TEXT_SECONDARY, DANGER, GOOD } from '@/src/theme/colors'
import { FONT_BOLD, FONT_REGULAR } from '@/src/theme/typography'

/**
 * Opened by the link in Supabase's signup confirmation email (`skycast://confirm-email#access_token=…`).
 * The link proves the address is real and signs the user in.
 */
export default function ConfirmEmailScreen() {
  const router = useRouter()
  const link = useAuthLink()
  const setSession = useAuthStore((s) => s.setSession)

  const session = link.status === 'ready' ? link.session : null

  useEffect(() => {
    if (!session) return
    setSession(session)
    void syncPurchasesForUser(session.user.id)
  }, [session, setSession])

  if (link.status === 'checking') {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.sub}>Confirming your email…</Text>
        </View>
      </View>
    )
  }

  if (link.status === 'error') {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color={DANGER} />
          <Text style={styles.title}>Confirmation problem</Text>
          <Text style={styles.sub}>{link.message}</Text>
          <Text style={styles.sub}>Your email may already be confirmed — try signing in.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.primaryBtnText}>Go to Sign In</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  const email = link.session.user.email
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <View style={styles.center}>
        <Ionicons name="checkmark-circle" size={64} color={GOOD} />
        <Text style={styles.title}>Email confirmed</Text>
        <Text style={styles.sub}>{email ? `You're signed in as ${email}.` : "You're signed in."}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.primaryBtnText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  title: { fontSize: 24, color: TEXT_PRIMARY, ...FONT_BOLD, textAlign: 'center' },
  sub: { fontSize: 14, color: TEXT_SECONDARY, ...FONT_REGULAR, textAlign: 'center', lineHeight: 21 },
  primaryBtn: {
    backgroundColor: ACCENT, borderRadius: 14, height: 54, alignSelf: 'stretch',
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  primaryBtnText: { fontSize: 16, color: '#1a0d00', ...FONT_BOLD },
})
