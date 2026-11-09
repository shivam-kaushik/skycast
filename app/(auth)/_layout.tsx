import { Stack } from 'expo-router'
import { BG } from '@/src/theme/colors'

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: BG },
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot" />
      {/* Opened by links in Supabase emails: skycast://reset-password and skycast://confirm-email */}
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="confirm-email" />
    </Stack>
  )
}
