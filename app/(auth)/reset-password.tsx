import React, { useEffect, useState } from 'react'
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/src/api/supabase'
import { useAuthLink } from '@/src/hooks/useAuthLink'
import { useAuthStore } from '@/src/store/authStore'
import { validateNewPassword } from '@/src/utils/passwordRules'
import { syncPurchasesForUser } from '@/src/utils/postSignIn'
import {
  BG, ACCENT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY,
  GLASS_BG, GHOST_BORDER, DANGER, GOOD,
} from '@/src/theme/colors'
import { FONT_BOLD, FONT_MEDIUM, FONT_REGULAR, FONT_SEMIBOLD } from '@/src/theme/typography'

/**
 * Opened by the link in Supabase's password-reset email (`skycast://reset-password#access_token=…`).
 * Verifies the link, then lets the user choose a new password. The link signs them in, so afterwards
 * they continue straight into the app.
 */
export default function ResetPasswordScreen() {
  const router = useRouter()
  const link = useAuthLink()
  const setSession = useAuthStore((s) => s.setSession)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const session = link.status === 'ready' && link.type === 'recovery' ? link.session : null

  // A verified recovery link is a real sign-in: keep the app's auth state and purchases in step.
  useEffect(() => {
    if (!session) return
    setSession(session)
    void syncPurchasesForUser(session.user.id)
  }, [session, setSession])

  async function handleUpdate() {
    const problem = validateNewPassword(password, confirmPassword)
    if (problem) { setError(problem); return }

    setLoading(true)
    setError(null)
    const { error: authError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (authError) { setError(authError.message); return }
    setSaved(true)
  }

  if (link.status === 'checking') {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.successSub}>Verifying your link…</Text>
        </View>
      </View>
    )
  }

  if (!session) {
    const message = link.status === 'error' ? link.message : "This isn't a password reset link."
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color={DANGER} />
          <Text style={styles.successTitle}>Link problem</Text>
          <Text style={styles.successSub}>{message}</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.replace('/(auth)/forgot')}>
            <Text style={styles.primaryBtnText}>Request a new link</Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.loginLink}>Back to Sign In</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  if (saved) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={64} color={GOOD} />
          <Text style={styles.successTitle}>Password updated</Text>
          <Text style={styles.successSub}>You're signed in with your new password.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.primaryBtnText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.logoRow}>
          <Ionicons name="partly-sunny" size={40} color={ACCENT} />
          <Text style={styles.appName}>Skycast</Text>
        </View>

        <Text style={styles.heading}>Set a new password</Text>
        <Text style={styles.sub}>Choose a new password for {session.user.email ?? 'your account'}.</Text>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={DANGER} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>New Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={TEXT_TERTIARY} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Min 8 characters"
              placeholderTextColor={TEXT_TERTIARY}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={TEXT_TERTIARY} />
            </Pressable>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Confirm Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={TEXT_TERTIARY} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor={TEXT_TERTIARY}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={handleUpdate}
            />
          </View>
        </View>

        <Pressable style={styles.primaryBtn} onPress={handleUpdate} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#1a0d00" />
            : <Text style={styles.primaryBtnText}>Update Password</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { padding: 24, paddingTop: 72 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  successTitle: { fontSize: 24, color: TEXT_PRIMARY, ...FONT_BOLD, textAlign: 'center' },
  successSub: { fontSize: 14, color: TEXT_SECONDARY, ...FONT_REGULAR, textAlign: 'center', lineHeight: 21 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  appName: { fontSize: 26, color: TEXT_PRIMARY, ...FONT_BOLD },
  heading: { fontSize: 28, color: TEXT_PRIMARY, ...FONT_BOLD, marginBottom: 8 },
  sub: { fontSize: 14, color: TEXT_SECONDARY, ...FONT_REGULAR, lineHeight: 21, marginBottom: 28 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,107,107,0.12)', borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)', borderRadius: 12, padding: 12, marginBottom: 20,
  },
  errorText: { fontSize: 13, color: DANGER, flex: 1, ...FONT_MEDIUM },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, color: TEXT_TERTIARY, ...FONT_SEMIBOLD, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: GLASS_BG, borderWidth: 1, borderColor: GHOST_BORDER,
    borderRadius: 14, paddingHorizontal: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: TEXT_PRIMARY, ...FONT_REGULAR },
  primaryBtn: {
    backgroundColor: ACCENT, borderRadius: 14, height: 54, alignSelf: 'stretch',
    alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 20,
  },
  primaryBtnText: { fontSize: 16, color: '#1a0d00', ...FONT_BOLD },
  loginLink: { fontSize: 14, color: ACCENT, ...FONT_SEMIBOLD },
})
