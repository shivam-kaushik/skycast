import React, { useState } from 'react'
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as AppleAuthentication from 'expo-apple-authentication'
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin'
import { supabase } from '@/src/api/supabase'
import { loginUser } from '@/src/api/purchases'
import { useAuthStore } from '@/src/store/authStore'
import { usePremiumStore } from '@/src/store/premiumStore'
import {
  BG, ACCENT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY,
  GLASS_BG, GHOST_BORDER, DANGER, GOOD,
} from '@/src/theme/colors'
import { FONT_BOLD, FONT_MEDIUM, FONT_REGULAR, FONT_SEMIBOLD } from '@/src/theme/typography'

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  scopes: ['email', 'profile'],
})

export default function LoginScreen() {
  const router = useRouter()
  const { setSession } = useAuthStore()
  const { setPremium, loadQueryCount } = usePremiumStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function afterSession(userId: string) {
    const isPremium = await loginUser(userId)
    await setPremium(isPremium)
    if (isPremium) await loadQueryCount()
    router.back()
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }
    if (data.session) {
      setSession(data.session)
      await afterSession(data.session.user.id)
    }
    setLoading(false)
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError(null)
    try {
      await GoogleSignin.hasPlayServices()
      const userInfo = await GoogleSignin.signIn()
      const tokens = await GoogleSignin.getTokens()
      if (!tokens.idToken) {
        setError('Google sign-in failed — no ID token returned.')
        return
      }
      const { data, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: tokens.idToken,
      })
      if (authError) { setError(authError.message); return }
      if (data.session) {
        setSession(data.session)
        await afterSession(data.session.user.id)
      }
    } catch (e: unknown) {
      if (isErrorWithCode(e)) {
        if (e.code === statusCodes.SIGN_IN_CANCELLED) {
          // user cancelled — do nothing
        } else if (e.code === statusCodes.IN_PROGRESS) {
          setError('Sign-in already in progress.')
        } else if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          setError('Google Play Services not available on this device.')
        } else {
          setError('Google sign-in failed. Please try again.')
        }
      } else {
        setError('Google sign-in failed. Please try again.')
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleAppleLogin() {
    setAppleLoading(true)
    setError(null)
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      const { data, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken ?? '',
      })
      if (authError) { setError(authError.message); return }
      if (data.session) {
        setSession(data.session)
        await afterSession(data.session.user.id)
      }
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'ERR_REQUEST_CANCELED') {
        // user cancelled — do nothing
      } else {
        setError('Apple sign-in failed. Please try again.')
      }
    } finally {
      setAppleLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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

        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.sub}>Sign in to sync your premium across all your devices.</Text>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={DANGER} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Social sign-in buttons */}
        <View style={styles.socialRow}>
          <Pressable
            style={styles.socialBtn}
            onPress={handleGoogleLogin}
            disabled={googleLoading || appleLoading || loading}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color={TEXT_PRIMARY} />
            ) : (
              <>
                <GoogleIcon />
                <Text style={styles.socialBtnText}>Google</Text>
              </>
            )}
          </Pressable>

          {Platform.OS === 'ios' && (
            <Pressable
              style={styles.socialBtn}
              onPress={handleAppleLogin}
              disabled={appleLoading || googleLoading || loading}
            >
              {appleLoading ? (
                <ActivityIndicator size="small" color={TEXT_PRIMARY} />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={18} color={TEXT_PRIMARY} />
                  <Text style={styles.socialBtnText}>Apple</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or sign in with email</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email */}
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
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Password */}
        <View style={styles.fieldGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>Password</Text>
            <Pressable onPress={() => router.push('/(auth)/forgot')}>
              <Text style={styles.forgotLink}>Forgot?</Text>
            </Pressable>
          </View>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={TEXT_TERTIARY} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={TEXT_TERTIARY}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={TEXT_TERTIARY}
              />
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.primaryBtn} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#1a0d00" />
            : <Text style={styles.primaryBtnText}>Sign In</Text>}
        </Pressable>

        <View style={styles.signupRow}>
          <Text style={styles.signupPrompt}>Don't have an account? </Text>
          <Pressable onPress={() => router.replace('/(auth)/signup')}>
            <Text style={styles.signupLink}>Create one</Text>
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>
          Your account is used only to sync premium status across devices. Weather data never
          requires sign-in.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function GoogleIcon() {
  return (
    <View style={styles.googleIconWrap}>
      <Text style={styles.googleG}>G</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { padding: 24, paddingTop: 16 },
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
    borderColor: 'rgba(255,107,107,0.3)', borderRadius: 12,
    padding: 12, marginBottom: 20,
  },
  errorText: { fontSize: 13, color: DANGER, flex: 1, ...FONT_MEDIUM },
  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: 14,
    backgroundColor: GLASS_BG, borderWidth: 1, borderColor: GHOST_BORDER,
  },
  socialBtnText: { fontSize: 15, color: TEXT_PRIMARY, ...FONT_SEMIBOLD },
  googleIconWrap: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  googleG: { fontSize: 12, fontWeight: '700', color: '#4285F4' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: GHOST_BORDER },
  dividerText: { fontSize: 12, color: TEXT_TERTIARY, ...FONT_REGULAR },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, color: TEXT_TERTIARY, ...FONT_SEMIBOLD, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  forgotLink: { fontSize: 13, color: ACCENT, ...FONT_MEDIUM },
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
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  signupPrompt: { fontSize: 14, color: TEXT_SECONDARY, ...FONT_REGULAR },
  signupLink: { fontSize: 14, color: ACCENT, ...FONT_SEMIBOLD },
  disclaimer: {
    fontSize: 11, color: TEXT_TERTIARY, ...FONT_REGULAR,
    textAlign: 'center', lineHeight: 17, marginTop: 20,
  },
})
