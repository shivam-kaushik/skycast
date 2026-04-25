import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useWeather } from '@/src/hooks/useWeather'
import { useLunar } from '@/src/hooks/useLunar'
import { useSkyPhenomena } from '@/src/hooks/useSkyPhenomena'
import { useLocationStore } from '@/src/store/locationStore'
import MoonHero from '@/src/components/sky/MoonHero'
import SkyTiles from '@/src/components/sky/SkyTiles'
import RainbowAlert from '@/src/components/sky/RainbowAlert'
import SunsetBar from '@/src/components/sky/SunsetBar'
import { BG, TEXT_PRIMARY, TEXT_TERTIARY } from '@/src/theme/colors'
import { format } from 'date-fns'

export default function SkyScreen() {
  const insets = useSafeAreaInsets()
  const { lat, lon, cityName } = useLocationStore()
  const weatherQuery = useWeather(lat, lon)
  const lunar = useLunar(lat, lon)
  const phenomena = useSkyPhenomena(weatherQuery.data?.hourly, lat, lon)

  const sunsetTime = weatherQuery.data?.daily.sunset[0]
    ? new Date(weatherQuery.data.daily.sunset[0])
    : null

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 80 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.city}>{cityName}</Text>
        <Text style={styles.date}>{format(new Date(), 'EEEE, MMM d')}</Text>
      </View>

      <Text style={styles.sectionLabel}>MOON & LUNAR</Text>
      {lunar ? (
        <MoonHero lunar={lunar} />
      ) : (
        <Text style={styles.placeholder}>Loading lunar data…</Text>
      )}

      <Text style={styles.sectionLabel}>SKY CONDITIONS</Text>
      {phenomena && lunar ? (
        <SkyTiles phenomena={phenomena} lunar={lunar} />
      ) : (
        <Text style={styles.placeholder}>Loading sky data…</Text>
      )}

      {phenomena?.rainbowWindow && (
        <>
          <Text style={styles.sectionLabel}>PHENOMENA</Text>
          <RainbowAlert window={phenomena.rainbowWindow} />
        </>
      )}

      <Text style={styles.sectionLabel}>SUNSET</Text>
      {phenomena ? (
        <SunsetBar score={phenomena.sunsetScore} sunsetTime={sunsetTime} />
      ) : (
        <Text style={styles.placeholder}>Loading…</Text>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { gap: 12 },
  header: { paddingHorizontal: 16, marginBottom: 4 },
  city: { fontSize: 26, fontWeight: '300', color: TEXT_PRIMARY },
  date: { fontSize: 13, color: TEXT_TERTIARY, marginTop: 2 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: TEXT_TERTIARY,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  placeholder: { fontSize: 13, color: TEXT_TERTIARY, paddingHorizontal: 16 },
})
