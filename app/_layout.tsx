import '@/src/e2e/bootstrapWebE2e'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { DarkTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useLocation } from '@/src/hooks/useLocation'
import { usePremiumStore } from '@/src/store/premiumStore'
import { initPurchases, checkPremiumStatus } from '@/src/api/purchases'
import 'react-native-reanimated'

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = {
  initialRouteName: '(tabs)',
}

SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient()

function LocationBootstrap(): null {
  useLocation()
  return null
}

function PremiumBootstrap(): null {
  const { hydrate, setPremium, loadQueryCount } = usePremiumStore()
  useEffect(() => {
    async function bootstrap() {
      // Restore from disk immediately — no network wait, no flash of locked state
      await hydrate()
      // Then confirm with RevenueCat (may upgrade/downgrade the persisted status)
      await initPurchases()
      const isPremium = await checkPremiumStatus()
      await setPremium(isPremium)
      if (isPremium) await loadQueryCount()
    }
    bootstrap()
  }, [hydrate, setPremium, loadQueryCount])
  return null
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    PlusJakartaSans: require('../assets/fonts/PlusJakartaSans-Variable.ttf'),
    ...FontAwesome.font,
  })

  useEffect(() => {
    if (error) throw error
  }, [error])

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync()
    }
  }, [loaded])

  if (!loaded) {
    return null
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LocationBootstrap />
      <PremiumBootstrap />
      <ThemeProvider value={DarkTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
