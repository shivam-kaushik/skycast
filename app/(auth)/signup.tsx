import React, { useState } from 'react'
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/src/api/supabase'
import {
  BG, ACCENT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY,
  GLASS_BG, GHOST_BORDER, DANGER, GOOD,
} from '@/src/theme/colors'
import { FONT_BOLD, FONT_MEDIUM, FONT_REGULAR, FONT_SEMIBOLD } from '@/src/theme/typography'

export default function SignupScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSignup() {
    if (!email.trim() || !password) { setError('Please fill in all fields.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }

    setLoading(true)
    setError(null)
    const { error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    })
    setLoading(false)
    if (authError) { setError(authError.message); return }
    setSuccess(true)
  }

  if (success) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <View style={styles.successCenter}>
          <Ionicons name="checkmark-circle" size={64} color={GOOD} />
          <Text style={styles.successTitle}>Check your email</Text>
          <Text style={styles.successSub}>
            We sent a confirmation link to {email.trim().toLowerCase()}.{'\n'}
            Click it to activate your account, then sign in.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.primaryBtnText}>Back to Sign In</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={16} style={styles.backBtn}>
            <Ionicons name="chevron-down" size={24} color={TEXT_SECONDARY} />
          </Pressable>
        </View>

        <View style={styles.logoRow}>
          <Ionicons name="partly-sunny" size={40} color={ACCENT} />
          <Text style={styles.appName}>Skycast</Text>
        </View>

        <Text style={styles.heading}>Create account</Text>
        <Text style={styles.sub}>A free account lets you sync premium across all your devices.</Text>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={DANGER} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Email</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={TEXT_TERTIARY} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={TEXT_TERTIARY}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={TEXT_TERTIARY} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Min 8 characters"
              placeholderTextColor={TEXT_TERTIARY}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={TEXT_TERTIARY} />
            </Pressable>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Confirm Password</Text>
          <View style={[
            styles.inputWrap,
            confirmPassword.length > 0 && {
              borderColor: confirmPassword === password
                ? 'rgba(6,214,160,0.4)' : 'rgba(255,107,107,0.4)',
            },
          ]}>
            <Ionicons name="lock-closed-outline" size={18} color={TEXT_TERTIARY} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor={TEXT_TERTIARY}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              onSubmitEditing={handleSignup}
            />
            {confirmPassword.length > 0 && (
              <Ionicons
                name={confirmPassword === password ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={confirmPassword === password ? GOOD : DANGER}
              />
            )}
          </View>
        </View>

        <Pressable style={styles.primaryBtn} onPress={handleSignup} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#1a0d00" />
            : <Text style={styles.primaryBtnText}>Create Account</Text>}
        </Pressable>

        <View style={styles.loginRow}>
          <Text style={styles.loginPrompt}>Already have an account? </Text>
          <Pressable onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.loginLink}>Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { padding: 24, paddingTop: 16 },
  successCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  successTitle: { fontSize: 24, color: TEXT_PRIMARY, ...FONT_BOLD, textAlign: 'center' },
  successSub: { fontSize: 14, color: TEXT_SECONDARY, ...FONT_REGULAR, textAlign: 'center', lineHeight: 21 },
  topBar: { alignItems: 'flex-start', marginBottom: 24 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: GLASS_BG, borderWidth: 1, borderColor: GHOST_BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
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
    backgroundColor: ACCENT, borderRadius: 14, height: 54,
    alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 20,
  },
  primaryBtnText: { fontSize: 16, color: '#1a0d00', ...FONT_BOLD },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  loginPrompt: { fontSize: 14, color: TEXT_SECONDARY, ...FONT_REGULAR },
  loginLink: { fontSize: 14, color: ACCENT, ...FONT_SEMIBOLD },
})
