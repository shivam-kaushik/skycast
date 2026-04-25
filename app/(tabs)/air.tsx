import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Pressable,
  ImageBackground,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useLocationStore } from '@/src/store/locationStore'
import { usePrefsStore } from '@/src/store/prefsStore'
import { useAirQuality } from '@/src/hooks/useAirQuality'
import { useWeather } from '@/src/hooks/useWeather'
import LocationPickerModal from '@/src/components/home/LocationPickerModal'
import AQIGauge from '@/src/components/air/AQIGauge'
import PollenBars from '@/src/components/air/PollenBars'
import PollutantList from '@/src/components/air/PollutantList'
import AllergyRiskIndex from '@/src/components/air/AllergyRiskIndex'
import PollenTrendChart from '@/src/components/air/PollenTrendChart'
import { computeAllergyRisk } from '@/src/utils/allergyRisk'
import GlassCard from '@/src/components/shared/GlassCard'
import {
  BG,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  ACCENT,
  SECONDARY,
  SECONDARY_CONTAINER,
  SURFACE_CONTAINER_HIGHEST,
  ON_PRIMARY,
} from '@/src/theme/colors'
import { FONT_BOLD } from '@/src/theme/typography'

function getCurrentHourIdx(times: string[]): number {
  const now = new Date()
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:`
  const idx = times.findIndex((t) => t >= nowStr)
  return idx === -1 ? 0 : idx
}

function euroQualityLabel(e: number): string {
  if (e <= 20) return 'Excellent'
  if (e <= 40) return 'Good'
  if (e <= 60) return 'Fair'
  if (e <= 80) return 'Poor'
  return 'Very poor'
}

function degToCompass8(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const
  return dirs[Math.round(deg / 45) % 8] ?? 'N'
}

const MAP_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDVpDRdzSjcCinT_FW_UgJKPTxpL3zR7ku1nEKlkwv742tTqbbnYR7n_En-gSTVYIxQM7iFGloW37BchWr-g2_LskXYhLZbho_relsy-H0V1KPS9a45-wiJ9TQV8zyWKwmpXhmNfStbAAAlO3oZxxnfZ_LxdFgM6v8CJdEvphn9VupTsuN72QKr4gN5LzP6zx1rZBsg0zNElm3xLMVUxpa7Z5njT9Pfmah9rPl8FTcdqITHK13g4bmeMxzBtf4XEDw00LKJ_WrXtsk'

export default function AirScreen() {
  const router = useRouter()
  const unit = usePrefsStore((s) => s.unit)
  const { lat, lon, cityName, deviceCityName, savedLocations, recentLocationIds } =
    useLocationStore()
  const selectManualLocation = useLocationStore((s) => s.selectManualLocation)
  const useDeviceLocation = useLocationStore((s) => s.useDeviceLocation)
  const toggleFavorite = useLocationStore((s) => s.toggleFavorite)
  const [isPickerOpen, setPickerOpen] = useState(false)
  const { data: airQuality, isLoading } = useAirQuality(lat, lon)
  const { data: weather } = useWeather(lat, lon)

  if (isLoading || !airQuality) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={ACCENT} />
      </SafeAreaView>
    )
  }

  const { current, hourly } = airQuality
  const currentHourIdx = getCurrentHourIdx(hourly.time)
  const euroLabel = euroQualityLabel(current.europeanAqi)
  const barHeights = [16, 24, 12, 20, 14, 18, 10]
  const highlightIdx = 1

  const windSpeed = weather?.current.windSpeed ?? 0
  const windDir = weather?.current.windDirection ?? 0
  const humidity = weather?.current.humidity ?? 0
  const allergyRisk = computeAllergyRisk(hourly, currentHourIdx, humidity, windSpeed)

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['rgba(255, 193, 7, 0.12)', 'transparent']}
        style={styles.heroGlow}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="location-sharp" size={20} color={ACCENT} />
              <Text style={styles.cityName}>{cityName || 'Your Location'}</Text>
            </View>
            <Pressable style={styles.headerRight} onPress={() => setPickerOpen(true)}>
              <Text style={styles.unitText}>°{unit}</Text>
              <Ionicons name="moon-outline" size={22} color={TEXT_SECONDARY} />
            </Pressable>
          </View>

          <AQIGauge aqi={current.usAqi} />

          <View style={styles.bento}>
            <GlassCard style={styles.euroCard}>
              <View style={styles.euroTop}>
                <Text style={styles.euroTitle}>European AQI</Text>
                <Text style={styles.euroBadge}>{euroLabel}</Text>
              </View>
              <View style={styles.barRow}>
                {barHeights.map((h, i) => (
                  <View
                    key={i}
                    style={[
                      styles.bar,
                      { height: h * 1.2 },
                      i === highlightIdx ? styles.barHot : styles.barDim,
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.euroFoot}>
                Based on PM2.5, PM10, NO₂, O₃ and SO₂ concentrations across Europe.
              </Text>
            </GlassCard>

            <GlassCard style={styles.windCard}>
              <Text style={styles.windTitle}>Wind &amp; Flow</Text>
              <View style={styles.windRow}>
                <View style={styles.windIconBg}>
                  <Ionicons name="airplane-outline" size={22} color={SECONDARY} />
                </View>
                <View>
                  <Text style={styles.windSpeed}>{Math.round(windSpeed)} km/h</Text>
                  <Text style={styles.windDir}>{degToCompass8(windDir)}</Text>
                </View>
              </View>
              <View style={styles.humidityBlock}>
                <Text style={styles.humidityLabel}>Humidity</Text>
                <View style={styles.humidityTrack}>
                  <View style={[styles.humidityFill, { width: `${humidity}%` }]} />
                </View>
                <View style={styles.humidityScale}>
                  <Text style={styles.humidityTiny}>DRY</Text>
                  <Text style={styles.humidityTiny}>{humidity}%</Text>
                </View>
              </View>
            </GlassCard>
          </View>

          <View style={styles.pollutantHeader}>
            <Ionicons name="analytics-outline" size={22} color={ACCENT} />
            <Text style={styles.h2}>Pollutant Breakdown</Text>
          </View>
          <PollutantList current={current} />

          <View style={styles.pollenHeader}>
            <Ionicons name="flower-outline" size={22} color={ACCENT} />
            <Text style={styles.h2}>Allergen Outlook</Text>
          </View>
          <AllergyRiskIndex risk={allergyRisk} humidity={humidity} windSpeed={windSpeed} />
          <PollenBars hourly={hourly} currentHourIdx={currentHourIdx} />
          <PollenTrendChart hourly={hourly} startIdx={currentHourIdx} />

          <GlassCard style={styles.mapCard}>
            <ImageBackground source={{ uri: MAP_IMAGE }} style={styles.mapImage} imageStyle={styles.mapImg}>
              <LinearGradient
                colors={['transparent', BG]}
                style={StyleSheet.absoluteFillObject}
              />
              <Pressable testID="air-nav-radar-button" style={styles.mapBtn} onPress={() => router.push('/radar')}>
                <Ionicons name="map-outline" size={18} color={ON_PRIMARY} />
                <Text style={styles.mapBtnText}>View Air Quality Map</Text>
              </Pressable>
            </ImageBackground>
          </GlassCard>

          <View style={styles.bottomPad} />
        </ScrollView>
      </SafeAreaView>

      <LocationPickerModal
        visible={isPickerOpen}
        deviceCityName={deviceCityName}
        savedLocations={savedLocations}
        recentLocationIds={recentLocationIds}
        onClose={() => setPickerOpen(false)}
        onUseDeviceLocation={useDeviceLocation}
        onToggleFavorite={toggleFavorite}
        onSelectLocation={(location) => {
          selectManualLocation(location)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  heroGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    zIndex: 0,
  },
  safe: {
    flex: 1,
    zIndex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  centered: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityName: {
    ...FONT_BOLD,
    fontSize: 18,
    color: TEXT_PRIMARY,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  unitText: {
    ...FONT_BOLD,
    fontSize: 18,
    color: TEXT_SECONDARY,
  },
  bento: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  euroCard: {
    flexGrow: 1,
    minWidth: 280,
    padding: 20,
  },
  euroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  euroTitle: {
    ...FONT_BOLD,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: TEXT_TERTIARY,
  },
  euroBadge: {
    ...FONT_BOLD,
    color: ACCENT,
    fontSize: 14,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: 20,
    height: 48,
  },
  bar: {
    flex: 1,
    borderRadius: 4,
    minHeight: 8,
  },
  barDim: {
    backgroundColor: SURFACE_CONTAINER_HIGHEST,
    opacity: 0.35,
  },
  barHot: {
    backgroundColor: ACCENT,
  },
  euroFoot: {
    marginTop: 16,
    fontSize: 13,
    color: TEXT_TERTIARY,
    lineHeight: 18,
  },
  windCard: {
    flexGrow: 1,
    minWidth: 160,
    padding: 20,
    gap: 16,
  },
  windTitle: {
    ...FONT_BOLD,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: TEXT_TERTIARY,
  },
  windRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  windIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${SECONDARY_CONTAINER}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  windSpeed: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  windDir: {
    fontSize: 12,
    color: TEXT_TERTIARY,
    marginTop: 2,
  },
  humidityBlock: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 14,
    gap: 8,
  },
  humidityLabel: {
    ...FONT_BOLD,
    fontSize: 10,
    letterSpacing: 1,
    color: TEXT_TERTIARY,
  },
  humidityTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: SURFACE_CONTAINER_HIGHEST,
    overflow: 'hidden',
  },
  humidityFill: {
    height: '100%',
    backgroundColor: SECONDARY,
  },
  humidityScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  humidityTiny: {
    ...FONT_BOLD,
    fontSize: 10,
    color: TEXT_TERTIARY,
  },
  pollutantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  pollenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 10,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  mapCard: {
    marginHorizontal: 16,
    marginTop: 20,
    overflow: 'hidden',
    padding: 0,
    borderWidth: 0,
  },
  mapImage: {
    height: 220,
    justifyContent: 'flex-end',
  },
  mapImg: {
    opacity: 0.65,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    margin: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: ACCENT,
  },
  mapBtnText: {
    ...FONT_BOLD,
    fontSize: 14,
    color: ON_PRIMARY,
  },
  bottomPad: {
    height: 24,
  },
})
